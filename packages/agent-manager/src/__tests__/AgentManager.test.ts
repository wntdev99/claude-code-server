import { describe, it, expect, beforeEach, vi } from 'vitest';
import { EventEmitter } from 'node:events';
import { AgentManager } from '../AgentManager.js';

// Mock AgentProcess
class MockAgentProcess extends EventEmitter {
  isRunning = false;
  pid = 99999;

  spawn = vi.fn(async () => {
    this.isRunning = true;
  });
  pause = vi.fn();
  resume = vi.fn();
  terminate = vi.fn(async () => {
    this.isRunning = false;
    this.emit('exit', 0);
  });
}

let latestMockProcess: MockAgentProcess;
const allMockProcesses: MockAgentProcess[] = [];

vi.mock('../AgentProcess.js', () => ({
  AgentProcess: vi.fn(() => {
    latestMockProcess = new MockAgentProcess();
    allMockProcesses.push(latestMockProcess);
    return latestMockProcess;
  }),
}));

describe('AgentManager', () => {
  let manager: AgentManager;

  beforeEach(() => {
    // Create a fresh instance (bypass singleton for testing)
    manager = new AgentManager();
    allMockProcesses.length = 0;
    vi.clearAllMocks();
  });

  describe('executeTask', () => {
    it('spawns a process and transitions to running', async () => {
      await manager.executeTask('task-1', 'Build app', {
        workspace: '/tmp/ws',
      });

      expect(latestMockProcess.spawn).toHaveBeenCalledWith('Build app', {
        cwd: '/tmp/ws',
        env: undefined,
      });
      expect(manager.getState('task-1')).toBe('running');
      expect(manager.getRunningTaskIds()).toContain('task-1');

      // Cleanup
      latestMockProcess.emit('exit', 0);
    });

    it('throws if agent already running for task', async () => {
      await manager.executeTask('task-1', 'prompt', { workspace: '/tmp' });

      await expect(
        manager.executeTask('task-1', 'prompt', { workspace: '/tmp' })
      ).rejects.toThrow('Agent already running for task task-1');

      latestMockProcess.emit('exit', 0);
    });

    it('passes env variables to agent process', async () => {
      await manager.executeTask('task-1', 'prompt', {
        workspace: '/tmp',
        env: { API_KEY: 'test-key' },
      });

      expect(latestMockProcess.spawn).toHaveBeenCalledWith('prompt', {
        cwd: '/tmp',
        env: { API_KEY: 'test-key' },
      });

      latestMockProcess.emit('exit', 0);
    });
  });

  describe('pause/resume', () => {
    it('pauses and resumes an agent', async () => {
      await manager.executeTask('task-1', 'prompt', { workspace: '/tmp' });
      const proc = latestMockProcess;

      manager.pause('task-1');
      expect(proc.pause).toHaveBeenCalled();
      expect(manager.getState('task-1')).toBe('paused');

      manager.resume('task-1');
      expect(proc.resume).toHaveBeenCalled();
      expect(manager.getState('task-1')).toBe('running');

      proc.emit('exit', 0);
    });
  });

  describe('terminate', () => {
    it('terminates agent and removes from registry', async () => {
      await manager.executeTask('task-1', 'prompt', { workspace: '/tmp' });

      await manager.terminate('task-1');

      expect(manager.getState('task-1')).toBeNull();
      expect(manager.getRunningTaskIds()).not.toContain('task-1');
    });

    it('does not throw for non-existent task', async () => {
      await expect(manager.terminate('no-such-task')).resolves.toBeUndefined();
    });
  });

  describe('event forwarding', () => {
    it('emits log events from stdout', async () => {
      const logs: string[] = [];
      manager.on('log:task-1', (msg: string) => logs.push(msg));

      await manager.executeTask('task-1', 'prompt', { workspace: '/tmp' });
      const proc = latestMockProcess;

      proc.emit('stdout', 'Building app...');
      expect(logs).toContain('Building app...');

      proc.emit('exit', 0);
    });

    it('emits log events from stderr', async () => {
      const logs: string[] = [];
      manager.on('log:task-1', (msg: string) => logs.push(msg));

      await manager.executeTask('task-1', 'prompt', { workspace: '/tmp' });
      const proc = latestMockProcess;

      proc.emit('stderr', 'Warning text');
      expect(logs.some((l) => l.includes('stderr') && l.includes('Warning text'))).toBe(true);

      proc.emit('exit', 0);
    });

    it('emits state events on transitions', async () => {
      const states: string[] = [];
      manager.on('state:task-1', (state: string) => states.push(state));

      await manager.executeTask('task-1', 'prompt', { workspace: '/tmp' });
      const proc = latestMockProcess;

      // Should have captured 'running' from execute transition
      expect(states).toContain('running');

      proc.emit('exit', 0);
    });

    it('emits exit events', async () => {
      const exitCodes: (number | null)[] = [];
      manager.on('exit:task-1', (code: number | null) => exitCodes.push(code));

      await manager.executeTask('task-1', 'prompt', { workspace: '/tmp' });
      latestMockProcess.emit('exit', 0);

      expect(exitCodes).toEqual([0]);
    });
  });

  describe('protocol handling', () => {
    it('transitions to waiting_review on PHASE_COMPLETE', async () => {
      const protocols: unknown[] = [];
      manager.on('protocol:task-1', (p: unknown) => protocols.push(p));

      await manager.executeTask('task-1', 'prompt', { workspace: '/tmp' });
      const proc = latestMockProcess;

      // Simulate PHASE_COMPLETE protocol in stdout
      proc.emit(
        'stdout',
        '=== PHASE 1 COMPLETE ===\nCompleted: Phase 1 (Planning)\nDocuments created:\n- doc.md\n'
      );

      expect(manager.getState('task-1')).toBe('waiting_review');
      expect(proc.pause).toHaveBeenCalled();
      expect(protocols.length).toBeGreaterThanOrEqual(1);
      expect(protocols[0]).toHaveProperty('type', 'PHASE_COMPLETE');

      proc.emit('exit', 0);
    });

    it('transitions to waiting_question on USER_QUESTION', async () => {
      await manager.executeTask('task-1', 'prompt', { workspace: '/tmp' });
      const proc = latestMockProcess;

      proc.emit(
        'stdout',
        '[USER_QUESTION]\ncategory: choice\nquestion: Pick a DB\noptions:\n  - PostgreSQL\n  - MySQL\n[/USER_QUESTION]'
      );

      expect(manager.getState('task-1')).toBe('waiting_question');
      expect(proc.pause).toHaveBeenCalled();

      proc.emit('exit', 0);
    });

    it('transitions to completed on CUSTOM_TASK_COMPLETE', async () => {
      await manager.executeTask('task-1', 'prompt', { workspace: '/tmp' });
      const proc = latestMockProcess;

      proc.emit('stdout', '=== CUSTOM TASK COMPLETE ===\n');

      expect(manager.getState('task-1')).toBe('completed');

      proc.emit('exit', 0);
    });

    it('transitions to failed on fatal ERROR', async () => {
      await manager.executeTask('task-1', 'prompt', { workspace: '/tmp' });
      const proc = latestMockProcess;

      proc.emit(
        'stdout',
        '[ERROR]\ntype: fatal\nmessage: Permission denied\ndetails: Cannot access\nrecovery: checkpoint_and_fail\n[/ERROR]'
      );

      expect(manager.getState('task-1')).toBe('failed');

      proc.emit('exit', 1);
    });
  });

  describe('exit handling', () => {
    it('transitions to completed on exit code 0', async () => {
      const states: string[] = [];
      manager.on('state:task-1', (s: string) => states.push(s));

      await manager.executeTask('task-1', 'prompt', { workspace: '/tmp' });
      latestMockProcess.emit('exit', 0);

      expect(states).toContain('completed');
    });

    it('transitions to failed on non-zero exit code', async () => {
      const states: string[] = [];
      manager.on('state:task-1', (s: string) => states.push(s));

      await manager.executeTask('task-1', 'prompt', { workspace: '/tmp' });
      latestMockProcess.emit('exit', 1);

      expect(states).toContain('failed');
    });

    it('removes agent from registry after exit', async () => {
      await manager.executeTask('task-1', 'prompt', { workspace: '/tmp' });
      expect(manager.getRunningTaskIds()).toContain('task-1');

      latestMockProcess.emit('exit', 0);
      expect(manager.getRunningTaskIds()).not.toContain('task-1');
    });

    it('ignores exit during respawn (isRespawning flag)', async () => {
      await manager.executeTask('task-1', 'prompt', { workspace: '/tmp' });
      const firstProc = latestMockProcess;

      // Get to waiting_review
      firstProc.emit(
        'stdout',
        '=== PHASE 1 COMPLETE ===\nCompleted: Phase 1\nDocuments created:\n- doc.md\n'
      );
      expect(manager.getState('task-1')).toBe('waiting_review');

      // Respawn via requestRework (async)
      const reworkPromise = manager.requestRework('task-1', 'Fix issues');

      // The old process terminate fires exit, but isRespawning should prevent cleanup
      await reworkPromise;

      // Agent should still be in registry with running state (respawned)
      expect(manager.getState('task-1')).toBe('running');
      expect(manager.getRunningTaskIds()).toContain('task-1');

      // New process was spawned
      const newProc = latestMockProcess;
      expect(newProc).not.toBe(firstProc);
      expect(newProc.spawn).toHaveBeenCalledWith(
        expect.stringContaining('Rework Required'),
        expect.any(Object)
      );

      newProc.emit('exit', 0);
    });
  });

  describe('approveReview', () => {
    it('resumes agent on last phase approval (no nextPhasePrompt)', async () => {
      await manager.executeTask('task-1', 'prompt', { workspace: '/tmp' });
      const proc = latestMockProcess;

      // Get to waiting_review state
      proc.emit(
        'stdout',
        '=== PHASE 1 COMPLETE ===\nCompleted: Phase 1\nDocuments created:\n- doc.md\n'
      );
      expect(manager.getState('task-1')).toBe('waiting_review');

      await manager.approveReview('task-1');
      expect(manager.getState('task-1')).toBe('running');
      expect(proc.resume).toHaveBeenCalled();

      proc.emit('exit', 0);
    });

    it('respawns agent with next phase prompt when provided', async () => {
      await manager.executeTask('task-1', 'phase 1 prompt', { workspace: '/tmp' });
      const firstProc = latestMockProcess;

      // Get to waiting_review
      firstProc.emit(
        'stdout',
        '=== PHASE 1 COMPLETE ===\nCompleted: Phase 1\nDocuments created:\n- doc.md\n'
      );

      await manager.approveReview('task-1', 'phase 2 prompt', {
        workspace: '/tmp',
        env: { CURRENT_PHASE: '2' },
      });

      // Should have spawned a new process
      const newProc = latestMockProcess;
      expect(newProc).not.toBe(firstProc);
      expect(newProc.spawn).toHaveBeenCalledWith('phase 2 prompt', {
        cwd: '/tmp',
        env: { CURRENT_PHASE: '2' },
      });
      expect(manager.getState('task-1')).toBe('running');

      // Old process should have been terminated
      expect(firstProc.terminate).toHaveBeenCalled();

      newProc.emit('exit', 0);
    });
  });

  describe('requestRework', () => {
    it('respawns agent with augmented prompt containing feedback', async () => {
      await manager.executeTask('task-1', 'original prompt', { workspace: '/tmp' });
      const firstProc = latestMockProcess;

      // Get to waiting_review
      firstProc.emit(
        'stdout',
        '=== PHASE 1 COMPLETE ===\nCompleted: Phase 1\nDocuments created:\n- doc.md\n'
      );

      await manager.requestRework('task-1', 'Add more detail');

      const newProc = latestMockProcess;
      expect(newProc).not.toBe(firstProc);
      expect(manager.getState('task-1')).toBe('running');
      expect(firstProc.terminate).toHaveBeenCalled();

      // New process should have been spawned with augmented prompt
      expect(newProc.spawn).toHaveBeenCalledWith(
        expect.stringContaining('original prompt'),
        expect.any(Object)
      );
      expect(newProc.spawn).toHaveBeenCalledWith(
        expect.stringContaining('Rework Required'),
        expect.any(Object)
      );
      expect(newProc.spawn).toHaveBeenCalledWith(
        expect.stringContaining('Add more detail'),
        expect.any(Object)
      );

      newProc.emit('exit', 0);
    });
  });

  describe('sendAnswer', () => {
    it('respawns agent with augmented prompt containing answer', async () => {
      await manager.executeTask('task-1', 'original prompt', { workspace: '/tmp' });
      const firstProc = latestMockProcess;

      // Get to waiting_question
      firstProc.emit(
        'stdout',
        '[USER_QUESTION]\ncategory: choice\nquestion: Pick\noptions:\n  - A\n  - B\n[/USER_QUESTION]'
      );
      expect(manager.getState('task-1')).toBe('waiting_question');

      await manager.sendAnswer('task-1', 'A');

      const newProc = latestMockProcess;
      expect(newProc).not.toBe(firstProc);
      expect(manager.getState('task-1')).toBe('running');
      expect(firstProc.terminate).toHaveBeenCalled();

      // New process should have been spawned with augmented prompt
      expect(newProc.spawn).toHaveBeenCalledWith(
        expect.stringContaining('original prompt'),
        expect.any(Object)
      );
      expect(newProc.spawn).toHaveBeenCalledWith(
        expect.stringContaining('Answer to Previous Question'),
        expect.any(Object)
      );
      expect(newProc.spawn).toHaveBeenCalledWith(
        expect.stringContaining('A'),
        expect.any(Object)
      );

      newProc.emit('exit', 0);
    });
  });

  describe('error handling', () => {
    it('throws when getting non-existent task for pause', () => {
      expect(() => manager.pause('no-task')).toThrow('No agent found for task no-task');
    });

    it('throws when getting non-existent task for resume', () => {
      expect(() => manager.resume('no-task')).toThrow('No agent found for task no-task');
    });

    it('throws when getting non-existent task for sendAnswer', async () => {
      await expect(manager.sendAnswer('no-task', 'answer')).rejects.toThrow(
        'No agent found for task no-task'
      );
    });

    it('returns null state for non-existent task', () => {
      expect(manager.getState('no-task')).toBeNull();
    });
  });

  describe('shutdownAll', () => {
    it('terminates all running agents', async () => {
      await manager.executeTask('task-1', 'p1', { workspace: '/tmp/1' });
      const proc1 = latestMockProcess;

      await manager.executeTask('task-2', 'p2', { workspace: '/tmp/2' });
      const proc2 = latestMockProcess;

      expect(manager.getRunningTaskIds().length).toBe(2);

      await manager.shutdownAll();

      expect(proc1.terminate).toHaveBeenCalled();
      expect(proc2.terminate).toHaveBeenCalled();
    });
  });
});
