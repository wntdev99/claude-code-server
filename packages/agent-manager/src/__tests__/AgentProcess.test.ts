import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { EventEmitter } from 'node:events';
import { AgentProcess } from '../AgentProcess.js';

// Create a mock ChildProcess that extends EventEmitter
class MockChildProcess extends EventEmitter {
  pid = 12345;
  stdin = {
    writable: true,
    write: vi.fn(),
    end: vi.fn(),
  };
  stdout = new EventEmitter();
  stderr = new EventEmitter();
  kill = vi.fn();
}

let mockChild: MockChildProcess;

vi.mock('node:child_process', () => ({
  spawn: vi.fn(() => {
    mockChild = new MockChildProcess();
    return mockChild;
  }),
}));

describe('AgentProcess', () => {
  let agent: AgentProcess;

  beforeEach(() => {
    agent = new AgentProcess();
    vi.clearAllMocks();
  });

  afterEach(async () => {
    // Ensure cleanup
    if (agent.isRunning && mockChild) {
      mockChild.emit('exit', 0);
    }
  });

  describe('spawn', () => {
    it('starts a claude process with -p flag', async () => {
      const { spawn } = await import('node:child_process');

      await agent.spawn('Build an app', { cwd: '/tmp/workspace' });

      expect(spawn).toHaveBeenCalledWith(
        'claude',
        ['-p', 'Build an app'],
        expect.objectContaining({
          cwd: '/tmp/workspace',
          stdio: ['pipe', 'pipe', 'pipe'],
        })
      );
    });

    it('closes stdin after spawn', async () => {
      await agent.spawn('Test prompt', { cwd: '/tmp' });
      expect(mockChild.stdin.end).toHaveBeenCalled();
    });

    it('sets isRunning to true after spawn', async () => {
      expect(agent.isRunning).toBe(false);
      await agent.spawn('Test prompt', { cwd: '/tmp' });
      expect(agent.isRunning).toBe(true);
    });

    it('exposes pid from child process', async () => {
      await agent.spawn('Test prompt', { cwd: '/tmp' });
      expect(agent.pid).toBe(12345);
    });

    it('throws if process already spawned', async () => {
      await agent.spawn('Test prompt', { cwd: '/tmp' });
      await expect(agent.spawn('Another prompt', { cwd: '/tmp' })).rejects.toThrow(
        'Process already spawned'
      );
    });

    it('passes custom env variables merged with process.env', async () => {
      const { spawn } = await import('node:child_process');

      await agent.spawn('Test', {
        cwd: '/tmp',
        env: { MY_VAR: 'hello', ANOTHER: 'world' },
      });

      expect(spawn).toHaveBeenCalledWith(
        'claude',
        ['-p', 'Test'],
        expect.objectContaining({
          env: expect.objectContaining({
            MY_VAR: 'hello',
            ANOTHER: 'world',
          }),
        })
      );
    });
  });

  describe('events', () => {
    it('emits stdout events from child process', async () => {
      await agent.spawn('Test', { cwd: '/tmp' });

      const output: string[] = [];
      agent.on('stdout', (data: string) => output.push(data));

      mockChild.stdout.emit('data', Buffer.from('Hello world'));
      expect(output).toEqual(['Hello world']);
    });

    it('emits stderr events from child process', async () => {
      await agent.spawn('Test', { cwd: '/tmp' });

      const errors: string[] = [];
      agent.on('stderr', (data: string) => errors.push(data));

      mockChild.stderr.emit('data', Buffer.from('Error occurred'));
      expect(errors).toEqual(['Error occurred']);
    });

    it('emits exit event and resets state on process exit', async () => {
      await agent.spawn('Test', { cwd: '/tmp' });
      expect(agent.isRunning).toBe(true);

      const exitCodes: (number | null)[] = [];
      agent.on('exit', (code: number | null) => exitCodes.push(code));

      mockChild.emit('exit', 0);

      expect(agent.isRunning).toBe(false);
      expect(agent.pid).toBeUndefined();
      expect(exitCodes).toEqual([0]);
    });

    it('emits error event and resets isRunning on process error', async () => {
      await agent.spawn('Test', { cwd: '/tmp' });

      const errors: Error[] = [];
      agent.on('error', (err: Error) => errors.push(err));

      const testErr = new Error('spawn failed');
      mockChild.emit('error', testErr);

      expect(agent.isRunning).toBe(false);
      expect(errors).toEqual([testErr]);
    });

    it('handles exit with non-zero code', async () => {
      await agent.spawn('Test', { cwd: '/tmp' });

      const exitCodes: (number | null)[] = [];
      agent.on('exit', (code: number | null) => exitCodes.push(code));

      mockChild.emit('exit', 1);

      expect(agent.isRunning).toBe(false);
      expect(exitCodes).toEqual([1]);
    });

    it('handles exit with null code (signal kill)', async () => {
      await agent.spawn('Test', { cwd: '/tmp' });

      const exitCodes: (number | null)[] = [];
      agent.on('exit', (code: number | null) => exitCodes.push(code));

      mockChild.emit('exit', null);

      expect(agent.isRunning).toBe(false);
      expect(exitCodes).toEqual([null]);
    });
  });

  describe('pause/resume', () => {
    it('sends SIGTSTP on pause', async () => {
      await agent.spawn('Test', { cwd: '/tmp' });
      agent.pause();
      expect(mockChild.kill).toHaveBeenCalledWith('SIGTSTP');
    });

    it('sends SIGCONT on resume', async () => {
      await agent.spawn('Test', { cwd: '/tmp' });
      agent.resume();
      expect(mockChild.kill).toHaveBeenCalledWith('SIGCONT');
    });

    it('does not throw when pausing a non-running process', () => {
      expect(() => agent.pause()).not.toThrow();
    });

    it('does not throw when resuming a non-running process', () => {
      expect(() => agent.resume()).not.toThrow();
    });
  });

  describe('terminate', () => {
    it('sends SIGTERM and resolves on exit', async () => {
      await agent.spawn('Test', { cwd: '/tmp' });

      const terminatePromise = agent.terminate();

      // Simulate process exiting after SIGTERM
      expect(mockChild.kill).toHaveBeenCalledWith('SIGTERM');
      mockChild.emit('exit', 0);

      await terminatePromise;
      expect(agent.isRunning).toBe(false);
    });

    it('resolves immediately if no process', async () => {
      // No spawn called, should resolve without error
      await expect(agent.terminate()).resolves.toBeUndefined();
    });

    it('falls back to SIGKILL after timeout', async () => {
      await agent.spawn('Test', { cwd: '/tmp' });

      // Use a very short timeout
      const terminatePromise = agent.terminate(50);

      // Don't emit exit - let timeout trigger SIGKILL
      await terminatePromise;

      expect(mockChild.kill).toHaveBeenCalledWith('SIGTERM');
      expect(mockChild.kill).toHaveBeenCalledWith('SIGKILL');
    }, 5000);
  });

});
