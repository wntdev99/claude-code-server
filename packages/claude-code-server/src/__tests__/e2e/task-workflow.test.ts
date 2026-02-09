import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { PrismaClient } from '@prisma/client';
import path from 'path';

/**
 * E2E Workflow Tests
 *
 * Tests the complete task lifecycle through the DB layer:
 * 1. Task creation → execution → phase complete → review → approval → next phase
 * 2. Question flow: create → answer → verify
 * 3. Review with changes requested → feedback saved → rework
 */

const dbPath = path.resolve(__dirname, '../../../../core/prisma/dev.db');
const prisma = new PrismaClient({
  datasources: { db: { url: `file:${dbPath}` } },
});

beforeAll(async () => {
  await prisma.log.deleteMany();
  await prisma.checkpoint.deleteMany();
  await prisma.question.deleteMany();
  await prisma.review.deleteMany();
  await prisma.task.deleteMany();
});

afterAll(async () => {
  await prisma.log.deleteMany();
  await prisma.checkpoint.deleteMany();
  await prisma.question.deleteMany();
  await prisma.review.deleteMany();
  await prisma.task.deleteMany();
  await prisma.$disconnect();
});

describe('Full create_app workflow', () => {
  let taskId: string;

  it('creates a create_app task', async () => {
    const task = await prisma.task.create({
      data: {
        title: 'Build E-commerce App',
        type: 'create_app',
        description: 'Create a full-stack e-commerce app with React and Node.js',
        status: 'draft',
        workspace: '/projects/ecommerce-test',
      },
    });

    taskId = task.id;
    expect(task.status).toBe('draft');
    expect(task.type).toBe('create_app');
    expect(task.progress).toBe(0);
    expect(task.currentPhase).toBeNull();
  });

  it('starts execution - transitions to in_progress phase 1', async () => {
    const task = await prisma.task.update({
      where: { id: taskId },
      data: {
        status: 'in_progress',
        currentPhase: 1,
        progress: 0,
      },
    });

    expect(task.status).toBe('in_progress');
    expect(task.currentPhase).toBe(1);
  });

  it('creates logs during Phase 1 execution', async () => {
    await prisma.log.createMany({
      data: [
        { taskId, level: 'info', message: 'Starting Phase 1: Planning' },
        { taskId, level: 'info', message: 'Reading guide: 01_idea.md' },
        { taskId, level: 'info', message: 'Generating planning document 1/9...' },
      ],
    });

    const logs = await prisma.log.findMany({
      where: { taskId },
      orderBy: { createdAt: 'asc' },
    });

    expect(logs.length).toBe(3);
  });

  it('Phase 1 complete - creates review with deliverables', async () => {
    const deliverables = [
      { path: 'docs/planning/01_idea.md', content: 'App concept and vision...', size: 1200 },
      { path: 'docs/planning/02_market.md', content: 'Market analysis...', size: 980 },
      { path: 'docs/planning/03_persona.md', content: 'User personas...', size: 1100 },
    ];

    // Task transitions to review state
    await prisma.task.update({
      where: { id: taskId },
      data: { status: 'review' },
    });

    const review = await prisma.review.create({
      data: {
        taskId,
        phase: 1,
        status: 'pending',
        deliverables: JSON.stringify(deliverables),
      },
    });

    expect(review.phase).toBe(1);
    expect(review.status).toBe('pending');

    const parsed = JSON.parse(review.deliverables);
    expect(parsed).toHaveLength(3);
    expect(parsed[0].path).toBe('docs/planning/01_idea.md');
  });

  it('user approves Phase 1 - advances to Phase 2', async () => {
    const review = await prisma.review.findFirst({
      where: { taskId, phase: 1, status: 'pending' },
    });
    expect(review).not.toBeNull();

    await prisma.review.update({
      where: { id: review!.id },
      data: { status: 'approved' },
    });

    // create_app has 4 phases total, so Phase 1 approved = 25% progress
    const task = await prisma.task.update({
      where: { id: taskId },
      data: {
        status: 'in_progress',
        currentPhase: 2,
        progress: 25,
      },
    });

    expect(task.currentPhase).toBe(2);
    expect(task.progress).toBe(25);
    expect(task.status).toBe('in_progress');
  });

  it('Phase 2 complete - review with changes requested', async () => {
    const deliverables = [
      { path: 'docs/design/01_screen.md', content: 'Screen flow design...', size: 800 },
      { path: 'docs/design/02_data_model.md', content: 'Data model...', size: 700 },
    ];

    await prisma.task.update({
      where: { id: taskId },
      data: { status: 'review' },
    });

    const review = await prisma.review.create({
      data: {
        taskId,
        phase: 2,
        status: 'pending',
        deliverables: JSON.stringify(deliverables),
      },
    });

    // User requests changes
    const updated = await prisma.review.update({
      where: { id: review.id },
      data: {
        status: 'changes_requested',
        feedback: 'Please add more detail to the data model section',
      },
    });

    expect(updated.status).toBe('changes_requested');
    expect(updated.feedback).toBe('Please add more detail to the data model section');

    // Task goes back to in_progress for rework
    await prisma.task.update({
      where: { id: taskId },
      data: { status: 'in_progress' },
    });
  });

  it('Phase 2 rework - new review after changes', async () => {
    const newDeliverables = [
      { path: 'docs/design/01_screen.md', content: 'Updated screen flow...', size: 1200 },
      { path: 'docs/design/02_data_model.md', content: 'Detailed data model with ERD...', size: 1500 },
    ];

    await prisma.task.update({
      where: { id: taskId },
      data: { status: 'review' },
    });

    const review = await prisma.review.create({
      data: {
        taskId,
        phase: 2,
        status: 'pending',
        deliverables: JSON.stringify(newDeliverables),
      },
    });

    // Approve reworked version
    await prisma.review.update({
      where: { id: review.id },
      data: { status: 'approved' },
    });

    const task = await prisma.task.update({
      where: { id: taskId },
      data: {
        status: 'in_progress',
        currentPhase: 3,
        progress: 50,
      },
    });

    expect(task.currentPhase).toBe(3);
    expect(task.progress).toBe(50);

    // Verify total reviews for Phase 2 (original + rework)
    const phase2Reviews = await prisma.review.findMany({
      where: { taskId, phase: 2 },
    });
    expect(phase2Reviews).toHaveLength(2);
  });

  it('final phase approved - task completes', async () => {
    // Skip to Phase 4 (final)
    await prisma.task.update({
      where: { id: taskId },
      data: { currentPhase: 4, progress: 75, status: 'review' },
    });

    const review = await prisma.review.create({
      data: {
        taskId,
        phase: 4,
        status: 'pending',
        deliverables: JSON.stringify([]),
      },
    });

    await prisma.review.update({
      where: { id: review.id },
      data: { status: 'approved' },
    });

    const task = await prisma.task.update({
      where: { id: taskId },
      data: {
        status: 'completed',
        progress: 100,
      },
    });

    expect(task.status).toBe('completed');
    expect(task.progress).toBe(100);
  });
});

describe('Question flow', () => {
  let taskId: string;

  it('creates task, question, answers it, and verifies', async () => {
    // Create task
    const task = await prisma.task.create({
      data: {
        title: 'Test Question Flow',
        type: 'create_app',
        description: 'Test',
        status: 'in_progress',
        workspace: '/projects/q-test',
        currentPhase: 1,
      },
    });
    taskId = task.id;

    // Create question
    const question = await prisma.question.create({
      data: {
        taskId,
        category: 'choice',
        question: 'Which database should we use?',
        options: JSON.stringify(['PostgreSQL', 'MySQL', 'SQLite']),
      },
    });

    expect(question.answer).toBeNull();
    expect(question.answeredAt).toBeNull();

    const options = JSON.parse(question.options as string);
    expect(options).toHaveLength(3);

    // Answer the question
    const answered = await prisma.question.update({
      where: { id: question.id },
      data: { answer: 'PostgreSQL', answeredAt: new Date() },
    });

    expect(answered.answer).toBe('PostgreSQL');
    expect(answered.answeredAt).not.toBeNull();

    // Verify no unanswered questions remain
    const remaining = await prisma.question.findMany({
      where: { taskId, answer: null },
    });

    expect(remaining).toHaveLength(0);
  });

  afterAll(async () => {
    if (taskId) {
      await prisma.question.deleteMany({ where: { taskId } });
      await prisma.task.delete({ where: { id: taskId } }).catch(() => {});
    }
  });
});

describe('Checkpoint flow', () => {
  let taskId: string;

  it('creates checkpoints at different stages', async () => {
    const task = await prisma.task.create({
      data: {
        title: 'Checkpoint Test',
        type: 'create_app',
        description: 'Test checkpoints',
        status: 'in_progress',
        workspace: '/projects/cp-test',
        currentPhase: 1,
      },
    });
    taskId = task.id;

    // Interval checkpoint
    await prisma.checkpoint.create({
      data: {
        taskId,
        reason: 'interval',
        state: JSON.stringify({
          currentPhase: 1,
          progress: 10,
          lastOutput: 'Working on planning...',
        }),
      },
    });

    // Phase complete checkpoint
    await prisma.checkpoint.create({
      data: {
        taskId,
        reason: 'phase_complete',
        state: JSON.stringify({
          currentPhase: 1,
          progress: 25,
          lastOutput: 'Phase 1 completed',
        }),
      },
    });

    const checkpoints = await prisma.checkpoint.findMany({
      where: { taskId },
      orderBy: { createdAt: 'desc' },
    });

    expect(checkpoints).toHaveLength(2);
    expect(checkpoints[0].reason).toBe('phase_complete');

    // Latest checkpoint should be the most recent
    const latest = checkpoints[0];
    const state = JSON.parse(latest.state as string);
    expect(state.progress).toBe(25);
  });

  afterAll(async () => {
    if (taskId) {
      await prisma.checkpoint.deleteMany({ where: { taskId } });
      await prisma.task.delete({ where: { id: taskId } }).catch(() => {});
    }
  });
});
