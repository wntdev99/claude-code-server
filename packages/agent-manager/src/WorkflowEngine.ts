import fs from 'node:fs';
import path from 'node:path';
import { EventEmitter } from 'node:events';
import { AgentManager } from './AgentManager.js';
import {
  getWorkflowDefinition,
  getPhaseDefinition,
  isLastPhase,
  hasReviewGate,
} from './WorkflowDefinitions.js';
import type { PhaseDefinition } from '@claude-code-server/shared';

export interface WorkflowContext {
  taskId: string;
  taskType: string;
  title: string;
  description: string;
  workspace: string;
  guideRoot: string; // Root path where /guide/ directory lives
  env?: Record<string, string>;
}

/**
 * WorkflowEngine - Coordinates phase-based execution for structured workflows.
 *
 * For custom tasks: delegates directly to AgentManager (single phase, no review gates).
 * For create_app/modify_app/workflow: executes phases sequentially with review gates.
 *
 * Events emitted:
 *   'phase:start'     ({ taskId, phase, phaseName })
 *   'phase:complete'  ({ taskId, phase, phaseName })
 *   'review:created'  ({ taskId, phase, reviewId })
 *   'task:complete'   ({ taskId })
 *   'task:failed'     ({ taskId, error })
 */
export class WorkflowEngine extends EventEmitter {
  private readonly agentManager: AgentManager;

  constructor(agentManager?: AgentManager) {
    super();
    this.agentManager = agentManager ?? AgentManager.getInstance();
  }

  /**
   * Start executing a workflow from a given phase.
   */
  async executePhase(ctx: WorkflowContext, phase: number): Promise<void> {
    const phaseDef = getPhaseDefinition(ctx.taskType, phase);

    this.emit('phase:start', {
      taskId: ctx.taskId,
      phase,
      phaseName: phaseDef.name,
    });

    // Build prompt for this phase
    const prompt = this.buildPhasePrompt(ctx, phaseDef);

    // Execute via AgentManager
    await this.agentManager.executeTask(ctx.taskId, prompt, {
      workspace: ctx.workspace,
      env: {
        ...ctx.env,
        TASK_TYPE: ctx.taskType,
        TASK_TITLE: ctx.title,
        CURRENT_PHASE: String(phase),
        PHASE_NAME: phaseDef.name,
      },
    });
  }

  /**
   * Build a complete prompt for a phase, including guide documents.
   */
  buildPhasePrompt(ctx: WorkflowContext, phaseDef: PhaseDefinition): string {
    const parts: string[] = [];

    // Task context
    parts.push(`# Task: ${ctx.title}`);
    parts.push(`Type: ${ctx.taskType}`);
    parts.push(`Phase ${phaseDef.phase}: ${phaseDef.name}`);
    parts.push('');
    parts.push('## Description');
    parts.push(ctx.description);
    parts.push('');

    // Phase instructions
    parts.push(`## Phase ${phaseDef.phase} Instructions`);
    parts.push(`You are executing Phase ${phaseDef.phase} (${phaseDef.name}) of a ${ctx.taskType} workflow.`);

    if (phaseDef.deliverableDir) {
      parts.push(`Deliverables should be placed in: ${phaseDef.deliverableDir}/`);
    }
    if (phaseDef.expectedDeliverables > 0) {
      parts.push(`Expected number of deliverables: ${phaseDef.expectedDeliverables}`);
    }
    parts.push('');

    // Inject guide documents if available
    if (phaseDef.guideDir) {
      const guides = this.loadGuides(ctx.guideRoot, phaseDef.guideDir);
      if (guides) {
        parts.push('## Reference Guides');
        parts.push(guides);
        parts.push('');
      }
    }

    // Phase completion signal
    if (hasReviewGate(ctx.taskType)) {
      parts.push('## Completion');
      parts.push('When you have completed all deliverables for this phase, output:');
      parts.push(`=== PHASE ${phaseDef.phase} COMPLETE ===`);
      parts.push(`Completed: Phase ${phaseDef.phase} (${phaseDef.name})`);
      parts.push('Documents created:');
      parts.push('- [list each file you created]');
    }

    return parts.join('\n');
  }

  /**
   * Load all guide documents from a directory.
   */
  loadGuides(guideRoot: string, guideDir: string): string | null {
    const fullPath = path.join(guideRoot, guideDir);

    if (!fs.existsSync(fullPath)) {
      return null;
    }

    try {
      const files = fs.readdirSync(fullPath)
        .filter((f) => f.endsWith('.md'))
        .sort();

      if (files.length === 0) return null;

      return files
        .map((f) => {
          const content = fs.readFileSync(path.join(fullPath, f), 'utf-8');
          return `### ${f}\n${content}`;
        })
        .join('\n\n---\n\n');
    } catch {
      return null;
    }
  }

  /**
   * Handle phase completion: determine next action.
   * Returns 'review' if a review gate is needed, 'next_phase' if auto-continuing,
   * or 'complete' if workflow is finished.
   */
  getNextAction(taskType: string, currentPhase: number): 'review' | 'next_phase' | 'complete' {
    if (isLastPhase(taskType, currentPhase)) {
      return 'complete';
    }
    if (hasReviewGate(taskType)) {
      return 'review';
    }
    return 'next_phase';
  }

  /**
   * Calculate progress percentage based on current phase.
   */
  calculateProgress(taskType: string, currentPhase: number): number {
    const workflow = getWorkflowDefinition(taskType);
    const totalPhases = workflow.phases.length;
    return Math.round((currentPhase / totalPhases) * 100);
  }
}
