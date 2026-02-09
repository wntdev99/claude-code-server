import { describe, it, expect, afterAll } from 'vitest';
import { PrismaClient } from '@prisma/client';
import path from 'path';
import { getTotalPhases } from '@claude-code-server/agent-manager';

/**
 * Review flow tests - validates the review approval/rejection logic,
 * phase advancement, and progress calculation used by review API routes.
 */

const dbPath = path.resolve(__dirname, '../../../core/prisma/dev.db');
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

describe('Review approval flow', () => {
  it('approves review and advances to next phase', async () => {
    const task = await prisma.task.create({
      data: {
        title: 'Review Flow Test',
        type: 'create_app',
        description: 'Test review approval flow',
        status: 'review',
        workspace: '/tmp/review-test',
        currentPhase: 1,
      },
    });
    createdTaskIds.push(task.id);

    const review = await prisma.review.create({
      data: {
        taskId: task.id,
        phase: 1,
        status: 'pending',
        deliverables: JSON.stringify([{ path: 'docs/planning/01_idea.md', size: 500 }]),
      },
    });

    // Approve review
    await prisma.review.update({
      where: { id: review.id },
      data: { status: 'approved' },
    });

    // Calculate next phase and progress (mirrors route logic)
    const totalPhases = getTotalPhases(task.type);
    const nextPhase = review.phase + 1;
    const progress = Math.round((nextPhase / totalPhases) * 100);

    const updated = await prisma.task.update({
      where: { id: task.id },
      data: {
        status: 'in_progress',
        currentPhase: nextPhase,
        progress,
      },
    });

    expect(updated.currentPhase).toBe(2);
    expect(updated.status).toBe('in_progress');
    expect(updated.progress).toBe(50); // 2/4 = 50%
  });

  it('completes task when final phase is approved', async () => {
    const task = await prisma.task.create({
      data: {
        title: 'Final Phase Test',
        type: 'create_app',
        description: 'Test final phase approval',
        status: 'review',
        workspace: '/tmp/final-test',
        currentPhase: 4,
        progress: 75,
      },
    });
    createdTaskIds.push(task.id);

    const review = await prisma.review.create({
      data: {
        taskId: task.id,
        phase: 4,
        status: 'pending',
        deliverables: '[]',
      },
    });

    // Approve final phase
    await prisma.review.update({
      where: { id: review.id },
      data: { status: 'approved' },
    });

    const totalPhases = getTotalPhases(task.type);
    const lastPhase = review.phase >= totalPhases;
    expect(lastPhase).toBe(true);

    const completed = await prisma.task.update({
      where: { id: task.id },
      data: {
        status: 'completed',
        currentPhase: review.phase,
        progress: 100,
      },
    });

    expect(completed.status).toBe('completed');
    expect(completed.progress).toBe(100);
  });
});

describe('Review changes_requested flow', () => {
  it('saves feedback and allows rework', async () => {
    const task = await prisma.task.create({
      data: {
        title: 'Rework Test',
        type: 'create_app',
        description: 'Test changes requested flow',
        status: 'review',
        workspace: '/tmp/rework-test',
        currentPhase: 2,
      },
    });
    createdTaskIds.push(task.id);

    const review = await prisma.review.create({
      data: {
        taskId: task.id,
        phase: 2,
        status: 'pending',
        deliverables: JSON.stringify([{ path: 'docs/design/01_screen.md', size: 300 }]),
      },
    });

    // Request changes
    const updated = await prisma.review.update({
      where: { id: review.id },
      data: {
        status: 'changes_requested',
        feedback: 'Please add more detail to the data model section',
      },
    });

    expect(updated.status).toBe('changes_requested');
    expect(updated.feedback).toContain('data model');

    // Task goes back to in_progress for rework (same phase)
    const reworkTask = await prisma.task.update({
      where: { id: task.id },
      data: { status: 'in_progress' },
    });

    expect(reworkTask.status).toBe('in_progress');
    expect(reworkTask.currentPhase).toBe(2); // Same phase
  });

  it('creates new review after rework', async () => {
    const task = await prisma.task.create({
      data: {
        title: 'Rework Cycle Test',
        type: 'create_app',
        description: 'Test rework then resubmit',
        status: 'review',
        workspace: '/tmp/rework-cycle',
        currentPhase: 1,
      },
    });
    createdTaskIds.push(task.id);

    // Original review - changes requested
    await prisma.review.create({
      data: {
        taskId: task.id,
        phase: 1,
        status: 'changes_requested',
        feedback: 'Needs improvement',
        deliverables: '[]',
      },
    });

    // Rework complete - new review
    const newReview = await prisma.review.create({
      data: {
        taskId: task.id,
        phase: 1,
        status: 'pending',
        deliverables: JSON.stringify([{ path: 'docs/planning/01_idea.md', size: 1200 }]),
      },
    });

    // Check both reviews exist for the same phase
    const allReviews = await prisma.review.findMany({
      where: { taskId: task.id, phase: 1 },
    });

    expect(allReviews).toHaveLength(2);
    expect(allReviews.some((r) => r.status === 'changes_requested')).toBe(true);
    expect(allReviews.some((r) => r.status === 'pending')).toBe(true);

    // Approve the reworked version
    await prisma.review.update({
      where: { id: newReview.id },
      data: { status: 'approved' },
    });

    const approved = await prisma.review.findUnique({ where: { id: newReview.id } });
    expect(approved!.status).toBe('approved');
  });
});

describe('Review with deliverables JSON', () => {
  it('stores and retrieves complex deliverable data', async () => {
    const task = await prisma.task.create({
      data: {
        title: 'Deliverables JSON Test',
        type: 'create_app',
        description: 'Test deliverable storage',
        status: 'review',
        workspace: '/tmp/del-test',
        currentPhase: 1,
      },
    });
    createdTaskIds.push(task.id);

    const deliverables = [
      { path: 'docs/planning/01_idea.md', content: 'App concept...', size: 1200 },
      { path: 'docs/planning/02_market.md', content: 'Market analysis...', size: 980 },
      { path: 'docs/planning/03_persona.md', content: 'User personas...', size: 1100 },
    ];

    const review = await prisma.review.create({
      data: {
        taskId: task.id,
        phase: 1,
        status: 'pending',
        deliverables: JSON.stringify(deliverables),
      },
    });

    const parsed = JSON.parse(review.deliverables);
    expect(parsed).toHaveLength(3);
    expect(parsed[0].path).toBe('docs/planning/01_idea.md');
    expect(parsed[0].size).toBe(1200);
    expect(parsed.reduce((sum: number, d: { size: number }) => sum + d.size, 0)).toBe(3280);
  });
});

describe('Question flow with review', () => {
  it('creates question during phase, then completes phase with review', async () => {
    const task = await prisma.task.create({
      data: {
        title: 'Question + Review Test',
        type: 'create_app',
        description: 'Test question then review flow',
        status: 'in_progress',
        workspace: '/tmp/qr-test',
        currentPhase: 1,
      },
    });
    createdTaskIds.push(task.id);

    // Agent asks a question during phase 1
    const question = await prisma.question.create({
      data: {
        taskId: task.id,
        category: 'business',
        question: 'What revenue model?',
        options: JSON.stringify(['Subscription', 'Freemium']),
      },
    });

    // User answers
    await prisma.question.update({
      where: { id: question.id },
      data: { answer: 'Subscription', answeredAt: new Date() },
    });

    // Verify no unanswered questions
    const unanswered = await prisma.question.findMany({
      where: { taskId: task.id, answer: null },
    });
    expect(unanswered).toHaveLength(0);

    // Phase 1 completes -> review
    await prisma.task.update({
      where: { id: task.id },
      data: { status: 'review' },
    });

    const review = await prisma.review.create({
      data: {
        taskId: task.id,
        phase: 1,
        status: 'pending',
        deliverables: '[]',
      },
    });

    expect(review.status).toBe('pending');

    // Verify task has both questions and reviews
    const fullTask = await prisma.task.findUnique({
      where: { id: task.id },
      include: { questions: true, reviews: true },
    });
    expect(fullTask!.questions).toHaveLength(1);
    expect(fullTask!.reviews).toHaveLength(1);
  });
});

describe('Phase progress calculation', () => {
  it('calculates correct progress for create_app (4 phases)', () => {
    const totalPhases = getTotalPhases('create_app');
    expect(totalPhases).toBe(4);

    expect(Math.round((1 / totalPhases) * 100)).toBe(25);
    expect(Math.round((2 / totalPhases) * 100)).toBe(50);
    expect(Math.round((3 / totalPhases) * 100)).toBe(75);
    expect(Math.round((4 / totalPhases) * 100)).toBe(100);
  });

  it('calculates correct progress for modify_app (4 phases)', () => {
    const totalPhases = getTotalPhases('modify_app');
    expect(totalPhases).toBe(4);
  });

  it('calculates correct progress for workflow (4 phases)', () => {
    const totalPhases = getTotalPhases('workflow');
    expect(totalPhases).toBe(4);
  });

  it('calculates correct progress for custom (1 phase)', () => {
    const totalPhases = getTotalPhases('custom');
    expect(totalPhases).toBe(1);
    expect(Math.round((1 / totalPhases) * 100)).toBe(100);
  });
});
