import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { CheckpointManager } from '../CheckpointManager.js';

describe('CheckpointManager', () => {
  let manager: CheckpointManager;
  let tmpDir: string;

  beforeEach(() => {
    manager = new CheckpointManager();
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'checkpoint-test-'));
  });

  afterEach(() => {
    manager.stopAll();
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  describe('create', () => {
    it('creates a checkpoint with full state', async () => {
      const checkpoint = await manager.create('task-1', 'manual', {
        currentPhase: 2,
        progress: 50,
        lastOutput: 'some output',
      });

      expect(checkpoint.taskId).toBe('task-1');
      expect(checkpoint.reason).toBe('manual');
      expect(checkpoint.state.currentPhase).toBe(2);
      expect(checkpoint.state.progress).toBe(50);
      expect(checkpoint.createdAt).toBeInstanceOf(Date);
    });

    it('fills missing state fields with defaults', async () => {
      const checkpoint = await manager.create('task-1', 'interval', {});

      expect(checkpoint.state.conversationHistory).toEqual([]);
      expect(checkpoint.state.environment).toEqual({});
      expect(checkpoint.state.currentPhase).toBeNull();
      expect(checkpoint.state.progress).toBe(0);
      expect(checkpoint.state.lastOutput).toBe('');
      expect(checkpoint.state.workspace).toEqual([]);
    });

    it('emits checkpoint:created event', async () => {
      const events: { taskId: string; reason: string }[] = [];
      manager.on('checkpoint:created', (e) => events.push(e));

      await manager.create('task-1', 'error', {});
      expect(events).toHaveLength(1);
      expect(events[0].taskId).toBe('task-1');
      expect(events[0].reason).toBe('error');
    });

    it('calls save handler when registered', async () => {
      const saved: unknown[] = [];
      manager.setSaveHandler(async (data) => {
        saved.push(data);
      });

      await manager.create('task-1', 'phase_complete', { currentPhase: 1 });
      expect(saved).toHaveLength(1);
    });

    it('saves to filesystem when workspace provided', async () => {
      await manager.create('task-1', 'manual', {}, tmpDir);

      const checkpointDir = path.join(tmpDir, '.checkpoints');
      expect(fs.existsSync(checkpointDir)).toBe(true);
      const files = fs.readdirSync(checkpointDir);
      expect(files).toHaveLength(1);
      expect(files[0]).toMatch(/^checkpoint_manual_\d+\.json$/);
    });
  });

  describe('loadFromFilesystem', () => {
    it('returns null when no checkpoints exist', () => {
      const result = manager.loadFromFilesystem(tmpDir);
      expect(result).toBeNull();
    });

    it('loads the latest checkpoint', async () => {
      await manager.create('task-1', 'interval', { progress: 25 }, tmpDir);
      // Small delay to ensure different timestamp
      await new Promise((r) => setTimeout(r, 10));
      await manager.create('task-1', 'manual', { progress: 75 }, tmpDir);

      const loaded = manager.loadFromFilesystem(tmpDir);
      expect(loaded).toBeTruthy();
      expect(loaded!.reason).toBe('manual');
      expect(loaded!.state.progress).toBe(75);
    });
  });

  describe('autoCheckpoint', () => {
    it('starts and stops auto-checkpoint interval', () => {
      const getState = () => ({ progress: 50 });
      manager.startAutoCheckpoint('task-1', getState);
      // Just verify it doesn't throw
      manager.stopAutoCheckpoint('task-1');
    });

    it('replaces existing interval on re-start', () => {
      const getState = () => ({ progress: 50 });
      manager.startAutoCheckpoint('task-1', getState);
      manager.startAutoCheckpoint('task-1', getState); // Should not throw
      manager.stopAll();
    });
  });

  describe('loadFromFilesystem edge cases', () => {
    it('handles corrupt JSON checkpoint files gracefully', async () => {
      const checkpointDir = path.join(tmpDir, '.checkpoints');
      fs.mkdirSync(checkpointDir, { recursive: true });
      fs.writeFileSync(
        path.join(checkpointDir, 'checkpoint_manual_9999999999999.json'),
        'NOT VALID JSON {'
      );

      const loaded = manager.loadFromFilesystem(tmpDir);
      // Should return null or skip the corrupt file without crashing
      expect(loaded).toBeNull();
    });

    it('skips corrupt files and loads valid ones', async () => {
      const checkpointDir = path.join(tmpDir, '.checkpoints');
      fs.mkdirSync(checkpointDir, { recursive: true });

      // Write a corrupt file with an earlier timestamp
      fs.writeFileSync(
        path.join(checkpointDir, 'checkpoint_manual_1000000000000.json'),
        'corrupt data'
      );

      // Write a valid checkpoint with a later timestamp
      await manager.create('task-1', 'manual', { progress: 80 }, tmpDir);

      const loaded = manager.loadFromFilesystem(tmpDir);
      expect(loaded).toBeTruthy();
      expect(loaded!.state.progress).toBe(80);
    });
  });

  describe('checkpoint reasons', () => {
    it('creates phase_complete checkpoint', async () => {
      const checkpoint = await manager.create('task-1', 'phase_complete', {
        currentPhase: 1,
        progress: 100,
      });
      expect(checkpoint.reason).toBe('phase_complete');
      expect(checkpoint.state.currentPhase).toBe(1);
      expect(checkpoint.state.progress).toBe(100);
    });

    it('creates error checkpoint', async () => {
      const checkpoint = await manager.create('task-1', 'error', {
        currentPhase: 2,
        progress: 30,
        lastOutput: 'Fatal error occurred',
      });
      expect(checkpoint.reason).toBe('error');
      expect(checkpoint.state.lastOutput).toBe('Fatal error occurred');
    });

    it('creates rate_limit checkpoint', async () => {
      const checkpoint = await manager.create('task-1', 'rate_limit', {
        currentPhase: 3,
        progress: 60,
      });
      expect(checkpoint.reason).toBe('rate_limit');
    });
  });
});
