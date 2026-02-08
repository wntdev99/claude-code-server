import fs from 'node:fs';
import path from 'node:path';
import { EventEmitter } from 'node:events';
import {
  CHECKPOINT_INTERVAL_MS,
  type CheckpointReason,
  type CheckpointState,
} from '@claude-code-server/shared';

export interface CheckpointData {
  taskId: string;
  reason: CheckpointReason;
  state: CheckpointState;
  createdAt: Date;
}

/**
 * CheckpointManager - Creates and manages checkpoints for agent state recovery.
 *
 * Checkpoints capture agent state at key moments:
 * - Every 10 minutes (interval)
 * - On rate limit detection
 * - On error
 * - On manual pause
 * - On phase completion
 *
 * Events emitted:
 *   'checkpoint:created' ({ taskId, reason })
 */
export class CheckpointManager extends EventEmitter {
  private intervals = new Map<string, ReturnType<typeof setInterval>>();
  private onSave: ((data: CheckpointData) => Promise<void>) | null = null;

  /**
   * Register a save callback (e.g., to persist via CheckpointRepository).
   */
  setSaveHandler(handler: (data: CheckpointData) => Promise<void>): void {
    this.onSave = handler;
  }

  /**
   * Create a checkpoint for the given task.
   */
  async create(
    taskId: string,
    reason: CheckpointReason,
    state: Partial<CheckpointState>,
    workspace?: string
  ): Promise<CheckpointData> {
    const fullState: CheckpointState = {
      conversationHistory: state.conversationHistory ?? [],
      environment: state.environment ?? {},
      currentPhase: state.currentPhase ?? null,
      progress: state.progress ?? 0,
      lastOutput: state.lastOutput ?? '',
      workspace: state.workspace ?? [],
    };

    const checkpoint: CheckpointData = {
      taskId,
      reason,
      state: fullState,
      createdAt: new Date(),
    };

    // Persist to DB via registered handler
    if (this.onSave) {
      await this.onSave(checkpoint);
    }

    // Also save to filesystem if workspace is provided
    if (workspace) {
      this.saveToFilesystem(checkpoint, workspace);
    }

    this.emit('checkpoint:created', { taskId, reason });
    return checkpoint;
  }

  /**
   * Start auto-checkpoint interval for a task.
   */
  startAutoCheckpoint(
    taskId: string,
    getState: () => Partial<CheckpointState>,
    workspace?: string
  ): void {
    // Clear existing interval if any
    this.stopAutoCheckpoint(taskId);

    const interval = setInterval(async () => {
      try {
        const state = getState();
        await this.create(taskId, 'interval', state, workspace);
      } catch {
        // Don't let checkpoint failures crash the process
      }
    }, CHECKPOINT_INTERVAL_MS);

    this.intervals.set(taskId, interval);
  }

  /**
   * Stop auto-checkpoint for a task.
   */
  stopAutoCheckpoint(taskId: string): void {
    const interval = this.intervals.get(taskId);
    if (interval) {
      clearInterval(interval);
      this.intervals.delete(taskId);
    }
  }

  /**
   * Stop all auto-checkpoints.
   */
  stopAll(): void {
    for (const [taskId] of this.intervals) {
      this.stopAutoCheckpoint(taskId);
    }
  }

  /**
   * Save checkpoint data to filesystem for offline recovery.
   * Also cleans up old checkpoints (keeps max 10).
   */
  private saveToFilesystem(checkpoint: CheckpointData, workspace: string): void {
    try {
      const checkpointDir = path.join(workspace, '.checkpoints');
      if (!fs.existsSync(checkpointDir)) {
        fs.mkdirSync(checkpointDir, { recursive: true });
      }

      const filename = `checkpoint_${checkpoint.reason}_${checkpoint.createdAt.getTime()}.json`;
      const filePath = path.join(checkpointDir, filename);
      fs.writeFileSync(filePath, JSON.stringify(checkpoint, null, 2));

      // Cleanup: keep only the latest MAX_CHECKPOINTS files
      this.cleanupOldCheckpoints(checkpointDir);
    } catch {
      // Filesystem save is best-effort
    }
  }

  /**
   * Remove old checkpoint files, keeping only the latest MAX_CHECKPOINTS.
   */
  private cleanupOldCheckpoints(checkpointDir: string): void {
    const MAX_CHECKPOINTS = 10;
    try {
      const files = fs.readdirSync(checkpointDir)
        .filter((f) => f.startsWith('checkpoint_') && f.endsWith('.json'))
        .sort()
        .reverse(); // Latest first (timestamps in name)

      if (files.length <= MAX_CHECKPOINTS) return;

      const toDelete = files.slice(MAX_CHECKPOINTS);
      for (const file of toDelete) {
        fs.unlinkSync(path.join(checkpointDir, file));
      }
    } catch {
      // Cleanup is best-effort
    }
  }

  /**
   * Load the latest checkpoint from filesystem.
   */
  loadFromFilesystem(workspace: string): CheckpointData | null {
    try {
      const checkpointDir = path.join(workspace, '.checkpoints');
      if (!fs.existsSync(checkpointDir)) {
        return null;
      }

      const files = fs.readdirSync(checkpointDir)
        .filter((f) => f.startsWith('checkpoint_') && f.endsWith('.json'))
        .sort()
        .reverse(); // Latest first (timestamps in name)

      if (files.length === 0) return null;

      const content = fs.readFileSync(path.join(checkpointDir, files[0]), 'utf-8');
      const data = JSON.parse(content);
      data.createdAt = new Date(data.createdAt);
      return data as CheckpointData;
    } catch {
      return null;
    }
  }
}
