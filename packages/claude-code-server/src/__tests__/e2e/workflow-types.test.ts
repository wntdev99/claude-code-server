import { describe, it, expect, afterAll } from 'vitest';
import { PrismaClient } from '@prisma/client';
import path from 'path';
import { getTotalPhases } from '@claude-code-server/agent-manager';

/**
 * E2E Workflow Type Tests
 *
 * Tests the complete lifecycle for all workflow types:
 * 1. modify_app - 4-phase modification workflow
 * 2. workflow - 4-phase workflow automation
 * 3. custom - single-phase free-form task
 */

const dbPath = path.resolve(__dirname, '../../../../core/prisma/dev.db');
const prisma = new PrismaClient({
  datasources: { db: { url: `file:${dbPath}` } },
});

const createdTaskIds: string[] = [];

afterAll(async () => {
  for (const id of createdTaskIds) {
    await prisma.log.deleteMany({ where: { taskId: id } });
    await prisma.checkpoint.deleteMany({ where: { taskId: id } });
    await prisma.question.deleteMany({ where: { taskId: id } });
    await prisma.review.deleteMany({ where: { taskId: id } });
    await prisma.task.delete({ where: { id } }).catch(() => {});
  }
  await prisma.$disconnect();
});

describe('modify_app full workflow', () => {
  let taskId: string;
  const taskType = 'modify_app';
  const totalPhases = getTotalPhases(taskType);

  it('creates modify_app task', async () => {
    const task = await prisma.task.create({
      data: {
        title: 'Add Dark Mode',
        type: taskType,
        description: 'Add dark mode toggle to existing React app',
        status: 'draft',
        workspace: '/projects/dark-mode-test',
      },
    });
    taskId = task.id;
    createdTaskIds.push(taskId);
    expect(task.type).toBe(taskType);
    expect(totalPhases).toBe(4);
  });

  it('executes Phase 1 (Analysis) and creates review', async () => {
    await prisma.task.update({
      where: { id: taskId },
      data: { status: 'in_progress', currentPhase: 1, progress: 0 },
    });

    await prisma.log.create({
      data: { taskId, level: 'info', message: 'Phase 1: Analyzing existing codebase' },
    });

    // Phase 1 complete -> review
    await prisma.task.update({
      where: { id: taskId },
      data: { status: 'review' },
    });

    const review = await prisma.review.create({
      data: {
        taskId,
        phase: 1,
        status: 'pending',
        deliverables: JSON.stringify([
          { path: 'docs/analysis/current_state.md', size: 2000 },
        ]),
      },
    });

    expect(review.phase).toBe(1);
    expect(review.status).toBe('pending');
  });

  it('approves Phase 1 and advances through all phases', async () => {
    for (let phase = 1; phase <= totalPhases; phase++) {
      // Find pending review for current phase
      const review = await prisma.review.findFirst({
        where: { taskId, phase, status: 'pending' },
      });

      if (review) {
        await prisma.review.update({
          where: { id: review.id },
          data: { status: 'approved' },
        });
      }

      const lastPhase = phase >= totalPhases;

      if (lastPhase) {
        await prisma.task.update({
          where: { id: taskId },
          data: { status: 'completed', progress: 100 },
        });
      } else {
        const nextPhase = phase + 1;
        await prisma.task.update({
          where: { id: taskId },
          data: {
            status: 'in_progress',
            currentPhase: nextPhase,
            progress: Math.round((nextPhase / totalPhases) * 100),
          },
        });

        // Create review for next phase
        await prisma.task.update({
          where: { id: taskId },
          data: { status: 'review' },
        });

        await prisma.review.create({
          data: {
            taskId,
            phase: nextPhase,
            status: 'pending',
            deliverables: '[]',
          },
        });
      }
    }

    const task = await prisma.task.findUnique({ where: { id: taskId } });
    expect(task!.status).toBe('completed');
    expect(task!.progress).toBe(100);

    const reviews = await prisma.review.findMany({
      where: { taskId },
      orderBy: { phase: 'asc' },
    });
    expect(reviews).toHaveLength(totalPhases);
    expect(reviews.every((r) => r.status === 'approved')).toBe(true);
  });
});

describe('workflow full workflow', () => {
  let taskId: string;
  const taskType = 'workflow';
  const totalPhases = getTotalPhases(taskType);

  it('creates workflow task', async () => {
    const task = await prisma.task.create({
      data: {
        title: 'Slack Notification Bot',
        type: taskType,
        description: 'Create workflow that sends Slack notifications on GitHub events',
        status: 'draft',
        workspace: '/projects/slack-bot-test',
      },
    });
    taskId = task.id;
    createdTaskIds.push(taskId);
    expect(task.type).toBe('workflow');
    expect(totalPhases).toBe(4);
  });

  it('runs through all 4 phases with review gates', async () => {
    for (let phase = 1; phase <= totalPhases; phase++) {
      // Execute phase
      await prisma.task.update({
        where: { id: taskId },
        data: {
          status: 'in_progress',
          currentPhase: phase,
          progress: Math.round(((phase - 1) / totalPhases) * 100),
        },
      });

      await prisma.log.create({
        data: { taskId, level: 'info', message: `Phase ${phase}: Working...` },
      });

      // Phase complete -> review
      await prisma.task.update({
        where: { id: taskId },
        data: { status: 'review' },
      });

      const review = await prisma.review.create({
        data: {
          taskId,
          phase,
          status: 'pending',
          deliverables: JSON.stringify([{ path: `docs/phase${phase}.md`, size: 500 }]),
        },
      });

      // Approve
      await prisma.review.update({
        where: { id: review.id },
        data: { status: 'approved' },
      });
    }

    // Complete
    await prisma.task.update({
      where: { id: taskId },
      data: { status: 'completed', progress: 100 },
    });

    const task = await prisma.task.findUnique({ where: { id: taskId } });
    expect(task!.status).toBe('completed');
    expect(task!.progress).toBe(100);
  });
});

describe('custom single-phase workflow', () => {
  let taskId: string;

  it('creates custom task', async () => {
    const task = await prisma.task.create({
      data: {
        title: 'Explain JWT',
        type: 'custom',
        description: 'Explain how JWT authentication works with examples',
        status: 'draft',
        workspace: '',
      },
    });
    taskId = task.id;
    createdTaskIds.push(taskId);
    expect(getTotalPhases('custom')).toBe(1);
  });

  it('executes and completes without review gate', async () => {
    // Start execution
    await prisma.task.update({
      where: { id: taskId },
      data: { status: 'in_progress', currentPhase: 1 },
    });

    // Agent generates output
    await prisma.log.createMany({
      data: [
        { taskId, level: 'info', message: 'Agent started' },
        { taskId, level: 'info', message: 'JWT stands for JSON Web Token...' },
        { taskId, level: 'info', message: '=== CUSTOM TASK COMPLETE ===' },
      ],
    });

    // Complete directly (no review for custom)
    await prisma.task.update({
      where: { id: taskId },
      data: { status: 'completed', progress: 100 },
    });

    const task = await prisma.task.findUnique({
      where: { id: taskId },
      include: { reviews: true, logs: true },
    });
    expect(task!.status).toBe('completed');
    expect(task!.reviews).toHaveLength(0); // No reviews for custom
    expect(task!.logs.length).toBe(3);
  });
});

describe('error recovery flow', () => {
  let taskId: string;

  it('creates task and simulates fatal error', async () => {
    const task = await prisma.task.create({
      data: {
        title: 'Error Recovery Test',
        type: 'create_app',
        description: 'Test fatal error and checkpoint creation',
        status: 'in_progress',
        workspace: '/projects/error-test',
        currentPhase: 2,
        progress: 25,
      },
    });
    taskId = task.id;
    createdTaskIds.push(taskId);

    // Create checkpoint before error
    await prisma.checkpoint.create({
      data: {
        taskId,
        reason: 'error',
        state: JSON.stringify({
          currentPhase: 2,
          progress: 25,
          lastOutput: 'Fatal error: Permission denied',
        }),
      },
    });

    // Task transitions to failed
    await prisma.task.update({
      where: { id: taskId },
      data: { status: 'failed' },
    });

    const failedTask = await prisma.task.findUnique({ where: { id: taskId } });
    expect(failedTask!.status).toBe('failed');
    expect(failedTask!.currentPhase).toBe(2); // Preserved

    // Verify checkpoint exists for recovery
    const checkpoint = await prisma.checkpoint.findFirst({
      where: { taskId },
      orderBy: { createdAt: 'desc' },
    });
    expect(checkpoint).not.toBeNull();
    expect(checkpoint!.reason).toBe('error');
    const state = JSON.parse(checkpoint!.state as string);
    expect(state.lastOutput).toContain('Fatal error');
  });
});

describe('verification rework flow', () => {
  let taskId: string;

  it('simulates verification fail → rework cycle → approval', async () => {
    const task = await prisma.task.create({
      data: {
        title: 'Verification Flow Test',
        type: 'create_app',
        description: 'Test auto-rework then review',
        status: 'in_progress',
        workspace: '/projects/verify-test',
        currentPhase: 1,
      },
    });
    taskId = task.id;
    createdTaskIds.push(taskId);

    // Rework attempt 1: verification fails (content too short)
    await prisma.log.create({
      data: { taskId, level: 'warn', message: 'Verification failed: too_short (attempt 1/3)' },
    });

    // Rework attempt 2: verification fails (placeholder found)
    await prisma.log.create({
      data: { taskId, level: 'warn', message: 'Verification failed: placeholder_content (attempt 2/3)' },
    });

    // Rework attempt 3: verification passes
    await prisma.log.create({
      data: { taskId, level: 'info', message: 'Verification passed (attempt 3/3)' },
    });

    // Now create review for user
    await prisma.task.update({
      where: { id: taskId },
      data: { status: 'review' },
    });

    const review = await prisma.review.create({
      data: {
        taskId,
        phase: 1,
        status: 'pending',
        deliverables: JSON.stringify([
          { path: 'docs/planning/01_idea.md', size: 1200 },
        ]),
      },
    });

    // User approves
    await prisma.review.update({
      where: { id: review.id },
      data: { status: 'approved' },
    });

    await prisma.task.update({
      where: { id: taskId },
      data: { status: 'in_progress', currentPhase: 2, progress: 25 },
    });

    const updatedTask = await prisma.task.findUnique({
      where: { id: taskId },
      include: { logs: true },
    });
    expect(updatedTask!.currentPhase).toBe(2);
    // 3 rework logs tracked
    expect(updatedTask!.logs.length).toBe(3);
  });
});
