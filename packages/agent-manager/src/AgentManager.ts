import { EventEmitter } from 'node:events';
import { AgentProcess } from './AgentProcess.js';
import { ProtocolParser } from './ProtocolParser.js';
import { StateMachine } from './StateMachine.js';
import { CheckpointManager } from './CheckpointManager.js';
import { RateLimitDetector } from './RateLimitDetector.js';
import { TokenTracker } from './TokenTracker.js';
import type { Protocol, AgentState } from '@claude-code-server/shared';

export interface AgentInfo {
  taskId: string;
  process: AgentProcess;
  parser: ProtocolParser;
  stateMachine: StateMachine;
  startedAt: Date;
  workspace?: string;
  lastPrompt?: string;
  lastEnv?: Record<string, string>;
  isRespawning?: boolean;
}

/**
 * AgentManager - Singleton orchestrator for managing Claude Code agent processes.
 *
 * Integrates: CheckpointManager, RateLimitDetector, TokenTracker
 *
 * Events emitted:
 *   'log:{taskId}'           (message: string)       - Agent log line
 *   'protocol:{taskId}'      (protocol: Protocol)    - Parsed protocol message
 *   'state:{taskId}'         (state: AgentState)     - State transition
 *   'exit:{taskId}'          (code: number | null)   - Agent exited
 */
export class AgentManager extends EventEmitter {
  private static instance: AgentManager | null = null;
  private agents = new Map<string, AgentInfo>();
  readonly checkpointManager = new CheckpointManager();
  readonly rateLimitDetector = new RateLimitDetector();
  readonly tokenTracker = new TokenTracker();

  static getInstance(): AgentManager {
    if (!AgentManager.instance) {
      AgentManager.instance = new AgentManager();
    }
    return AgentManager.instance;
  }

  /**
   * Execute a task by spawning a Claude Code agent.
   */
  async executeTask(
    taskId: string,
    prompt: string,
    options: {
      workspace: string;
      env?: Record<string, string>;
    }
  ): Promise<void> {
    if (this.agents.has(taskId)) {
      throw new Error(`Agent already running for task ${taskId}`);
    }

    const agentProcess = new AgentProcess();
    const parser = new ProtocolParser();
    const stateMachine = new StateMachine();

    const info: AgentInfo = {
      taskId,
      process: agentProcess,
      parser,
      stateMachine,
      startedAt: new Date(),
      workspace: options.workspace,
      lastPrompt: prompt,
      lastEnv: options.env,
    };

    this.agents.set(taskId, info);

    // Wire up event handlers
    this.wireProcessEvents(taskId, info);

    // Track state transitions
    stateMachine.onTransition((from, to, action) => {
      this.emit(`state:${taskId}`, to);
      this.emit(`log:${taskId}`, `[state] ${from} -> ${to} (${action})`);
    });

    // Start auto-checkpointing
    this.checkpointManager.startAutoCheckpoint(
      taskId,
      () => ({
        currentPhase: null,
        progress: 0,
        lastOutput: '',
      }),
      options.workspace
    );

    // Transition to running and spawn
    stateMachine.transition('execute');
    await agentProcess.spawn(prompt, {
      cwd: options.workspace,
      env: options.env,
    });
  }

  /**
   * Pause an agent.
   */
  pause(taskId: string): void {
    const info = this.getAgent(taskId);
    info.stateMachine.transition('pause');
    info.process.pause();
  }

  /**
   * Resume an agent.
   */
  resume(taskId: string): void {
    const info = this.getAgent(taskId);
    info.stateMachine.transition('resume');
    info.process.resume();
  }

  /**
   * Send answer to an agent's pending question by respawning with augmented prompt.
   * Since claude -p is one-shot and stdin is closed, we respawn with the answer in the prompt.
   */
  async sendAnswer(taskId: string, answer: string): Promise<void> {
    const info = this.getAgent(taskId);
    if (info.stateMachine.state !== 'waiting_question') return;

    const augmentedPrompt = `${info.lastPrompt}\n\n## Answer to Previous Question\n\nThe user provided the following answer to your question:\n\n${answer}\n\nPlease continue with your work using this information.`;

    await this.respawnAgent(taskId, augmentedPrompt, {
      workspace: info.workspace!,
      env: info.lastEnv,
    });
  }

  /**
   * Approve a review and advance to the next phase.
   * For non-last phases, provide nextPhasePrompt and options to spawn a new agent.
   * For the last phase, the existing process is resumed and will exit naturally.
   */
  async approveReview(
    taskId: string,
    nextPhasePrompt?: string,
    options?: { workspace: string; env?: Record<string, string> }
  ): Promise<void> {
    const info = this.getAgent(taskId);
    if (info.stateMachine.state !== 'waiting_review') return;

    if (nextPhasePrompt && options) {
      // Non-last phase: respawn with next phase prompt
      await this.respawnAgent(taskId, nextPhasePrompt, options);
    } else {
      // Last phase: resume existing process (it will exit naturally → completed)
      info.stateMachine.transition('approve');
      info.process.resume();
    }
  }

  /**
   * Request rework after review by respawning with feedback in the prompt.
   */
  async requestRework(taskId: string, feedback: string): Promise<void> {
    const info = this.getAgent(taskId);
    if (info.stateMachine.state !== 'waiting_review') return;

    const augmentedPrompt = `${info.lastPrompt}\n\n## Rework Required\n\nThe previous deliverables did not pass review. Please address the following feedback and resubmit:\n\n${feedback}`;

    await this.respawnAgent(taskId, augmentedPrompt, {
      workspace: info.workspace!,
      env: info.lastEnv,
    });
  }

  /**
   * Terminate an agent.
   */
  async terminate(taskId: string): Promise<void> {
    const info = this.agents.get(taskId);
    if (!info) return;

    // Create final checkpoint before termination
    await this.checkpointManager.create(
      taskId,
      'manual',
      {},
      info.workspace
    ).catch(() => {});

    this.checkpointManager.stopAutoCheckpoint(taskId);
    this.rateLimitDetector.cancelResume(taskId);

    await info.process.terminate();
    this.agents.delete(taskId);
  }

  /**
   * Get agent state.
   */
  getState(taskId: string): AgentState | null {
    return this.agents.get(taskId)?.stateMachine.state ?? null;
  }

  /**
   * Get all running agent task IDs.
   */
  getRunningTaskIds(): string[] {
    return Array.from(this.agents.keys());
  }

  /**
   * Gracefully shut down all agents with checkpoints.
   */
  async shutdownAll(): Promise<void> {
    const ids = this.getRunningTaskIds();
    await Promise.all(ids.map((id) => this.terminate(id)));
    this.checkpointManager.stopAll();
    this.rateLimitDetector.cancelAll();
  }

  /**
   * Respawn an agent with a new prompt. Terminates the old process and spawns a new one
   * while preserving the AgentInfo entry (state machine, event listeners on AgentManager).
   */
  private async respawnAgent(
    taskId: string,
    newPrompt: string,
    options: { workspace: string; env?: Record<string, string> }
  ): Promise<void> {
    const info = this.agents.get(taskId);
    if (!info) {
      return this.executeTask(taskId, newPrompt, options);
    }

    // Mark as respawning so exit handler ignores this termination
    info.isRespawning = true;

    // Stop timers during transition
    this.checkpointManager.stopAutoCheckpoint(taskId);
    this.rateLimitDetector.cancelResume(taskId);

    // Clean up old process
    info.process.removeAllListeners();
    await info.process.terminate().catch(() => {});

    // Create fresh process and parser
    const newProcess = new AgentProcess();
    const newParser = new ProtocolParser();
    info.process = newProcess;
    info.parser = newParser;
    info.lastPrompt = newPrompt;
    info.lastEnv = options.env;
    info.isRespawning = false;

    // Ensure state machine is in running state
    if (info.stateMachine.canTransition('approve')) {
      info.stateMachine.transition('approve');
    } else if (info.stateMachine.canTransition('rework')) {
      info.stateMachine.transition('rework');
    } else if (info.stateMachine.canTransition('answer')) {
      info.stateMachine.transition('answer');
    } else if (info.stateMachine.canTransition('resume')) {
      info.stateMachine.transition('resume');
    }

    // Wire events on new process
    this.wireProcessEvents(taskId, info);

    // Restart auto-checkpointing
    this.checkpointManager.startAutoCheckpoint(
      taskId,
      () => ({
        currentPhase: null,
        progress: 0,
        lastOutput: '',
      }),
      options.workspace
    );

    // Spawn new process
    await newProcess.spawn(newPrompt, {
      cwd: options.workspace,
      env: options.env,
    });
  }

  /**
   * Wire stdout/stderr/exit/error event handlers on an agent process.
   * Extracted from executeTask to allow reuse during respawn.
   */
  private wireProcessEvents(taskId: string, info: AgentInfo): void {
    const { process: agentProcess, stateMachine } = info;

    agentProcess.on('stdout', (data: string) => {
      this.emit(`log:${taskId}`, data);

      // Track token usage
      this.tokenTracker.processOutput(taskId, data);

      // Parse for protocols (use info.parser so respawn picks up new parser)
      const protocols = info.parser.feed(data);
      for (const protocol of protocols) {
        this.handleProtocol(taskId, protocol);
      }
    });

    agentProcess.on('stderr', (data: string) => {
      this.emit(`log:${taskId}`, `[stderr] ${data}`);

      // Check for rate limiting
      const rateLimitInfo = this.rateLimitDetector.detect(data);
      if (rateLimitInfo && stateMachine.state === 'running') {
        // Create checkpoint before pausing
        this.checkpointManager.create(
          taskId,
          'rate_limit',
          { lastOutput: data },
          info.workspace
        ).catch(() => {});

        this.rateLimitDetector.handle(
          taskId,
          rateLimitInfo,
          () => {
            if (stateMachine.canTransition('pause')) {
              stateMachine.transition('pause');
              agentProcess.pause();
            }
          },
          () => {
            if (stateMachine.canTransition('resume')) {
              stateMachine.transition('resume');
              agentProcess.resume();
            }
          }
        );
      }
    });

    agentProcess.on('exit', (code: number | null) => {
      // Skip exit handling during respawn — a new process is replacing this one
      if (info.isRespawning) return;

      // Stop auto-checkpointing
      this.checkpointManager.stopAutoCheckpoint(taskId);
      this.rateLimitDetector.cancelResume(taskId);

      if (stateMachine.state === 'running') {
        if (code === 0) {
          stateMachine.transition('complete');
        } else {
          stateMachine.transition('fail');
        }
      }
      this.emit(`state:${taskId}`, stateMachine.state);
      this.emit(`exit:${taskId}`, code);
      this.agents.delete(taskId);
    });

    agentProcess.on('error', (err: Error) => {
      this.emit(`log:${taskId}`, `[error] ${err.message}`);
    });
  }

  private getAgent(taskId: string): AgentInfo {
    const info = this.agents.get(taskId);
    if (!info) {
      throw new Error(`No agent found for task ${taskId}`);
    }
    return info;
  }

  private handleProtocol(taskId: string, protocol: Protocol): void {
    this.emit(`protocol:${taskId}`, protocol);

    const info = this.agents.get(taskId);
    if (!info) return;

    switch (protocol.type) {
      case 'PHASE_COMPLETE':
        if (info.stateMachine.canTransition('phase_complete')) {
          // Create checkpoint on phase complete
          this.checkpointManager.create(
            taskId,
            'phase_complete',
            { lastOutput: '' },
            info.workspace
          ).catch(() => {});

          info.stateMachine.transition('phase_complete');
          info.process.pause();
        }
        break;
      case 'USER_QUESTION':
        if (info.stateMachine.canTransition('ask_question')) {
          info.stateMachine.transition('ask_question');
          info.process.pause();
        }
        break;
      case 'CUSTOM_TASK_COMPLETE':
        if (info.stateMachine.canTransition('complete')) {
          info.stateMachine.transition('complete');
        }
        break;
      case 'ERROR':
        if (protocol.severity === 'fatal') {
          // Create checkpoint on fatal error
          this.checkpointManager.create(
            taskId,
            'error',
            { lastOutput: protocol.message },
            info.workspace
          ).catch(() => {});

          if (info.stateMachine.canTransition('fail')) {
            info.stateMachine.transition('fail');
          }
        }
        break;
    }
  }
}
