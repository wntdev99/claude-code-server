import type { PhaseDefinition, WorkflowDefinition, TaskType } from '@claude-code-server/shared';

/**
 * Workflow definitions for all 4 task types.
 * Source: CLAUDE.md "Task Types & Workflows" section
 *
 * Phase-A (create_app): Planning(9) -> Design(5) -> Development(6) -> Verification
 * Phase-B (modify_app): Analysis(3) -> Planning(4) -> Implementation(6) -> Testing(3)
 * Phase-C (workflow):   Planning -> Design -> Development -> Testing
 * Type-D  (custom):     Single-phase autonomous execution
 */

const CREATE_APP_PHASES: PhaseDefinition[] = [
  {
    phase: 1,
    name: 'Planning',
    steps: 9,
    deliverableDir: 'docs/planning',
    expectedDeliverables: 9,
    guideDir: 'guide/planning',
  },
  {
    phase: 2,
    name: 'Design',
    steps: 5,
    deliverableDir: 'docs/design',
    expectedDeliverables: 5,
    guideDir: 'guide/design',
  },
  {
    phase: 3,
    name: 'Development',
    steps: 6,
    deliverableDir: 'src',
    expectedDeliverables: -1, // Variable - at least 1 file
    guideDir: 'guide/development',
  },
  {
    phase: 4,
    name: 'Verification',
    steps: 1,
    deliverableDir: '',
    expectedDeliverables: 0,
    guideDir: 'guide/verification',
  },
];

const MODIFY_APP_PHASES: PhaseDefinition[] = [
  {
    phase: 1,
    name: 'Analysis',
    steps: 3,
    deliverableDir: 'docs/analysis',
    expectedDeliverables: 1,
    guideDir: null, // Autonomous analysis
  },
  {
    phase: 2,
    name: 'Planning',
    steps: 4,
    deliverableDir: 'docs/planning',
    expectedDeliverables: 1,
    guideDir: null, // Adapt Phase-A guides selectively
  },
  {
    phase: 3,
    name: 'Implementation',
    steps: 6,
    deliverableDir: 'src',
    expectedDeliverables: -1,
    guideDir: 'guide/development',
  },
  {
    phase: 4,
    name: 'Testing',
    steps: 3,
    deliverableDir: '',
    expectedDeliverables: 0,
    guideDir: null,
  },
];

const WORKFLOW_PHASES: PhaseDefinition[] = [
  {
    phase: 1,
    name: 'Planning',
    steps: 1,
    deliverableDir: 'docs/planning',
    expectedDeliverables: 1,
    guideDir: null, // Adapt Phase-A guides for workflow context
  },
  {
    phase: 2,
    name: 'Design',
    steps: 1,
    deliverableDir: 'docs/design',
    expectedDeliverables: 1,
    guideDir: null,
  },
  {
    phase: 3,
    name: 'Development',
    steps: 1,
    deliverableDir: 'src',
    expectedDeliverables: -1,
    guideDir: 'guide/development',
  },
  {
    phase: 4,
    name: 'Testing',
    steps: 1,
    deliverableDir: '',
    expectedDeliverables: 0,
    guideDir: null,
  },
];

const CUSTOM_PHASES: PhaseDefinition[] = [
  {
    phase: 1,
    name: 'Execution',
    steps: 1,
    deliverableDir: '',
    expectedDeliverables: 0,
    guideDir: null, // No guides for custom
  },
];

const WORKFLOW_MAP: Record<string, WorkflowDefinition> = {
  create_app: { type: 'create_app', phases: CREATE_APP_PHASES },
  modify_app: { type: 'modify_app', phases: MODIFY_APP_PHASES },
  workflow: { type: 'workflow', phases: WORKFLOW_PHASES },
  custom: { type: 'custom', phases: CUSTOM_PHASES },
};

export function getWorkflowDefinition(type: TaskType | string): WorkflowDefinition {
  const def = WORKFLOW_MAP[type];
  if (!def) {
    throw new Error(`Unknown workflow type: ${type}`);
  }
  return def;
}

export function getPhaseDefinition(type: TaskType | string, phase: number): PhaseDefinition {
  const workflow = getWorkflowDefinition(type);
  const phaseDef = workflow.phases.find((p) => p.phase === phase);
  if (!phaseDef) {
    throw new Error(`Phase ${phase} not found in workflow ${type}`);
  }
  return phaseDef;
}

export function getTotalPhases(type: TaskType | string): number {
  return getWorkflowDefinition(type).phases.length;
}

export function isLastPhase(type: TaskType | string, phase: number): boolean {
  return phase >= getTotalPhases(type);
}

export function hasReviewGate(type: TaskType | string): boolean {
  return type !== 'custom';
}
