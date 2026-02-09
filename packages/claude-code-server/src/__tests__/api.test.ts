import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { PrismaClient } from '@prisma/client';
import path from 'path';

/**
 * Phase 5 Verification: API integration tests
 *
 * Tests the core API flow that powers the custom workflow MVP:
 * 1. Create task (POST /api/tasks)
 * 2. Read task (GET /api/tasks/:id)
 * 3. Update task (PATCH /api/tasks/:id)
 * 4. Delete task (DELETE /api/tasks/:id)
 *
 * Note: These test the DB layer directly since Next.js API routes
 * require a running server. The routes are thin wrappers over Prisma
 * calls, so testing the DB operations validates the core logic.
 */

const dbPath = path.resolve(__dirname, '../../../core/prisma/dev.db');
const prisma = new PrismaClient({
  datasources: { db: { url: `file:${dbPath}` } },
});

// Track task IDs created by this test file for cleanup
const createdTaskIds: string[] = [];

afterAll(async () => {
  // Only clean up records created by this test file
  for (const id of createdTaskIds) {
    await prisma.log.deleteMany({ where: { taskId: id } });
    await prisma.checkpoint.deleteMany({ where: { taskId: id } });
    await prisma.question.deleteMany({ where: { taskId: id } });
    await prisma.review.deleteMany({ where: { taskId: id } });
    await prisma.task.delete({ where: { id } }).catch(() => {});
  }
  await prisma.$disconnect();
});

describe('Task API flow (custom workflow MVP)', () => {
  let taskId: string;

  it('creates a custom task', async () => {
    const task = await prisma.task.create({
      data: {
        title: 'Explain WebSockets',
        type: 'custom',
        description: 'Provide a detailed explanation of how WebSockets work with examples',
        status: 'draft',
        workspace: '',
      },
    });

    taskId = task.id;
    createdTaskIds.push(taskId);
    expect(task.title).toBe('Explain WebSockets');
    expect(task.type).toBe('custom');
    expect(task.status).toBe('draft');
    expect(task.progress).toBe(0);
  });

  it('reads task with relations', async () => {
    const task = await prisma.task.findUnique({
      where: { id: taskId },
      include: {
        reviews: true,
        questions: true,
        checkpoints: true,
        logs: true,
      },
    });

    expect(task).not.toBeNull();
    expect(task!.reviews).toEqual([]);
    expect(task!.questions).toEqual([]);
  });

  it('updates task status to in_progress', async () => {
    const task = await prisma.task.update({
      where: { id: taskId },
      data: {
        status: 'in_progress',
        workspace: '/projects/test-workspace',
      },
    });

    expect(task.status).toBe('in_progress');
    expect(task.workspace).toBe('/projects/test-workspace');
  });

  it('creates log entries (simulating agent output)', async () => {
    await prisma.log.create({
      data: { taskId, level: 'info', message: 'Agent started' },
    });
    await prisma.log.create({
      data: { taskId, level: 'info', message: 'Processing request...' },
    });
    await prisma.log.create({
      data: { taskId, level: 'info', message: 'WebSockets are a protocol...' },
    });

    const logs = await prisma.log.findMany({
      where: { taskId },
      orderBy: { createdAt: 'asc' },
    });

    expect(logs.length).toBe(3);
    expect(logs[0].message).toBe('Agent started');
  });

  it('creates a question (simulating USER_QUESTION protocol)', async () => {
    const question = await prisma.question.create({
      data: {
        taskId,
        category: 'clarification',
        question: 'Which aspect of WebSockets should I focus on?',
        options: JSON.stringify(['Protocol details', 'Implementation examples', 'Comparison with HTTP']),
      },
    });

    expect(question.answer).toBeNull();

    // Answer the question
    const answered = await prisma.question.update({
      where: { id: question.id },
      data: { answer: 'Implementation examples', answeredAt: new Date() },
    });

    expect(answered.answer).toBe('Implementation examples');
  });

  it('completes the task', async () => {
    const task = await prisma.task.update({
      where: { id: taskId },
      data: { status: 'completed', progress: 100 },
    });

    expect(task.status).toBe('completed');
    expect(task.progress).toBe(100);
  });

  it('lists tasks with filtering', async () => {
    const result = await prisma.task.findMany({
      where: { type: 'custom' },
    });

    expect(result.length).toBeGreaterThanOrEqual(1);
    expect(result.every((t) => t.type === 'custom')).toBe(true);
  });

  it('deletes task (cascade deletes related records)', async () => {
    // Verify related records exist
    const logsBefore = await prisma.log.count({ where: { taskId } });
    expect(logsBefore).toBeGreaterThan(0);

    // Delete task
    await prisma.task.delete({ where: { id: taskId } });

    // Verify cascade delete
    const task = await prisma.task.findUnique({ where: { id: taskId } });
    expect(task).toBeNull();

    const logsAfter = await prisma.log.count({ where: { taskId } });
    expect(logsAfter).toBe(0);

    const questionsAfter = await prisma.question.count({ where: { taskId } });
    expect(questionsAfter).toBe(0);
  });
});

describe('Settings API flow', () => {
  it('creates and reads settings', async () => {
    await prisma.settings.upsert({
      where: { key: 'claude_model' },
      update: { value: 'claude-sonnet-4-5' },
      create: { key: 'claude_model', value: 'claude-sonnet-4-5' },
    });

    const setting = await prisma.settings.findUnique({
      where: { key: 'claude_model' },
    });

    expect(setting).not.toBeNull();
    expect(setting!.value).toBe('claude-sonnet-4-5');
  });

  it('lists all settings', async () => {
    await prisma.settings.upsert({
      where: { key: 'github_token' },
      update: { value: 'ghp_test123' },
      create: { key: 'github_token', value: 'ghp_test123' },
    });

    const all = await prisma.settings.findMany();
    expect(all.length).toBeGreaterThanOrEqual(2);
  });
});

describe('Review flow (phase-based workflow simulation)', () => {
  let taskId: string;

  it('simulates a create_app Phase 1 review flow', async () => {
    // Create a create_app task
    const task = await prisma.task.create({
      data: {
        title: 'Build a Todo App',
        type: 'create_app',
        description: 'Create a React todo app with localStorage',
        status: 'in_progress',
        workspace: '/projects/todo-app',
        currentPhase: 1,
      },
    });
    taskId = task.id;
    createdTaskIds.push(taskId);

    // Agent completes Phase 1 - create review
    const review = await prisma.review.create({
      data: {
        taskId,
        phase: 1,
        status: 'pending',
        deliverables: JSON.stringify([
          'docs/planning/01_idea.md',
          'docs/planning/02_market.md',
          'docs/planning/03_persona.md',
        ]),
      },
    });

    expect(review.status).toBe('pending');

    // User approves
    const approved = await prisma.review.update({
      where: { id: review.id },
      data: { status: 'approved', feedback: 'Looks good, proceed!' },
    });

    expect(approved.status).toBe('approved');
    expect(approved.feedback).toBe('Looks good, proceed!');

    // Task moves to Phase 2
    await prisma.task.update({
      where: { id: taskId },
      data: { currentPhase: 2, progress: 25 },
    });

    const updatedTask = await prisma.task.findUnique({ where: { id: taskId } });
    expect(updatedTask!.currentPhase).toBe(2);
    expect(updatedTask!.progress).toBe(25);
  });

  // Cleanup handled by top-level afterAll
});
