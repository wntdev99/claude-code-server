import { spawn, type ChildProcess } from 'node:child_process';
import { EventEmitter } from 'node:events';
import { AGENT_GRACEFUL_SHUTDOWN_MS } from '@claude-code-server/shared';

export interface AgentProcessOptions {
  cwd: string;
  env?: Record<string, string>;
}

/**
 * Wrapper around child_process for Claude Code CLI.
 * Manages a single Claude Code process instance.
 *
 * Events emitted:
 *   'stdout' (data: string)  - stdout data
 *   'stderr' (data: string)  - stderr data
 *   'exit'   (code: number | null) - process exited
 */
export class AgentProcess extends EventEmitter {
  private process: ChildProcess | null = null;
  private _isRunning = false;

  get isRunning(): boolean {
    return this._isRunning;
  }

  get pid(): number | undefined {
    return this.process?.pid;
  }

  async spawn(prompt: string, options: AgentProcessOptions): Promise<void> {
    if (this.process) {
      throw new Error('Process already spawned. Terminate first.');
    }

    this.process = spawn('claude', ['--print', '--output-format', 'text', prompt], {
      cwd: options.cwd,
      env: {
        ...process.env,
        ...options.env,
      },
      stdio: ['pipe', 'pipe', 'pipe'],
    });

    this._isRunning = true;

    this.process.stdout?.on('data', (data: Buffer) => {
      this.emit('stdout', data.toString());
    });

    this.process.stderr?.on('data', (data: Buffer) => {
      this.emit('stderr', data.toString());
    });

    this.process.on('exit', (code) => {
      this._isRunning = false;
      this.process = null;
      this.emit('exit', code);
    });

    this.process.on('error', (err) => {
      this._isRunning = false;
      this.emit('error', err);
    });
  }

  /**
   * Send input to the agent's stdin.
   */
  sendInput(input: string): void {
    if (!this.process?.stdin?.writable) {
      throw new Error('Cannot write to agent stdin - process not running');
    }
    this.process.stdin.write(input + '\n');
  }

  /**
   * Pause the agent process (SIGTSTP).
   */
  pause(): void {
    if (this.process && this._isRunning) {
      this.process.kill('SIGTSTP');
    }
  }

  /**
   * Resume the agent process (SIGCONT).
   */
  resume(): void {
    if (this.process) {
      this.process.kill('SIGCONT');
    }
  }

  /**
   * Gracefully terminate the agent process (SIGTERM).
   * Falls back to SIGKILL after timeout.
   */
  async terminate(timeoutMs = AGENT_GRACEFUL_SHUTDOWN_MS): Promise<void> {
    if (!this.process) return;

    return new Promise<void>((resolve) => {
      const forceKillTimer = setTimeout(() => {
        if (this.process) {
          this.process.kill('SIGKILL');
        }
        resolve();
      }, timeoutMs);

      this.process!.once('exit', () => {
        clearTimeout(forceKillTimer);
        resolve();
      });

      this.process!.kill('SIGTERM');
    });
  }
}
