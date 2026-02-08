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
    };

    this.agents.set(taskId, info);

    // Wire up event handlers
    agentProcess.on('stdout', (data: string) => {
      this.emit(`log:${taskId}`, data);

      // Track token usage
      this.tokenTracker.processOutput(taskId, data);

      // Parse for protocols
      const protocols = parser.feed(data);
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
          options.workspace
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
   * Send answer to an agent's pending question.
   */
  sendAnswer(taskId: string, answer: string): void {
    const info = this.getAgent(taskId);
    if (info.stateMachine.state === 'waiting_question') {
      info.stateMachine.transition('answer');
      info.process.resume();
    }
    info.process.sendInput(answer);
  }

  /**
   * Approve a review and resume the agent.
   */
  approveReview(taskId: string): void {
    const info = this.getAgent(taskId);
    if (info.stateMachine.state === 'waiting_review') {
      info.stateMachine.transition('approve');
      info.process.resume();
    }
  }

  /**
   * Request rework after review.
   */
  requestRework(taskId: string, feedback: string): void {
    const info = this.getAgent(taskId);
    if (info.stateMachine.state === 'waiting_review') {
      info.stateMachine.transition('rework');
      info.process.resume();
      info.process.sendInput(feedback);
    }
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
