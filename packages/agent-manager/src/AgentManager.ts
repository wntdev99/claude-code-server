import { EventEmitter } from 'node:events';
import { AgentProcess } from './AgentProcess.js';
import { ProtocolParser } from './ProtocolParser.js';
import { StateMachine } from './StateMachine.js';
import type { Protocol, AgentState } from '@claude-code-server/shared';

export interface AgentInfo {
  taskId: string;
  process: AgentProcess;
  parser: ProtocolParser;
  stateMachine: StateMachine;
  startedAt: Date;
}

/**
 * AgentManager - Singleton orchestrator for managing Claude Code agent processes.
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
    };

    this.agents.set(taskId, info);

    // Wire up event handlers
    agentProcess.on('stdout', (data: string) => {
      this.emit(`log:${taskId}`, data);

      // Parse for protocols
      const protocols = parser.feed(data);
      for (const protocol of protocols) {
        this.handleProtocol(taskId, protocol);
      }
    });

    agentProcess.on('stderr', (data: string) => {
      this.emit(`log:${taskId}`, `[stderr] ${data}`);
    });

    agentProcess.on('exit', (code: number | null) => {
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
   * Gracefully shut down all agents.
   */
  async shutdownAll(): Promise<void> {
    const ids = this.getRunningTaskIds();
    await Promise.all(ids.map((id) => this.terminate(id)));
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
          info.stateMachine.transition('phase_complete');
          info.process.pause();
        }
        break;
      case 'USER_QUESTION':
        // Agent is paused waiting for answer - handled externally
        if (info.stateMachine.canTransition('pause')) {
          info.stateMachine.transition('pause');
          info.process.pause();
        }
        break;
      case 'ERROR':
        if (protocol.severity === 'fatal') {
          if (info.stateMachine.canTransition('fail')) {
            info.stateMachine.transition('fail');
          }
        }
        break;
    }
  }
}
