import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { PrismaClient } from '@prisma/client';
import { TaskRepository } from '../repositories/TaskRepository.js';
import { ReviewRepository } from '../repositories/ReviewRepository.js';
import { QuestionRepository } from '../repositories/QuestionRepository.js';
import { CheckpointRepository } from '../repositories/CheckpointRepository.js';
import { SettingsRepository } from '../repositories/SettingsRepository.js';
import { LogRepository } from '../repositories/LogRepository.js';

const prisma = new PrismaClient();

beforeAll(async () => {
  // Clean up before tests
  await prisma.log.deleteMany();
  await prisma.checkpoint.deleteMany();
  await prisma.question.deleteMany();
  await prisma.review.deleteMany();
  await prisma.task.deleteMany();
  await prisma.settings.deleteMany();
});

afterAll(async () => {
  await prisma.log.deleteMany();
  await prisma.checkpoint.deleteMany();
  await prisma.question.deleteMany();
  await prisma.review.deleteMany();
  await prisma.task.deleteMany();
  await prisma.settings.deleteMany();
  await prisma.$disconnect();
});

describe('TaskRepository', () => {
  const repo = new TaskRepository(prisma);
  let taskId: string;

  it('creates a task', async () => {
    const task = await repo.create({
      title: 'Test App',
      type: 'create_app',
      description: 'Build a test application',
      workspace: '/projects/test-app',
    });
    taskId = task.id;
    expect(task.title).toBe('Test App');
    expect(task.type).toBe('create_app');
    expect(task.status).toBe('draft');
    expect(task.progress).toBe(0);
  });

  it('finds task by id', async () => {
    const task = await repo.findById(taskId);
    expect(task).not.toBeNull();
    expect(task!.title).toBe('Test App');
  });

  it('lists tasks with pagination', async () => {
    const { tasks, total } = await repo.findAll({ page: 1, pageSize: 10 });
    expect(total).toBeGreaterThanOrEqual(1);
    expect(tasks.length).toBeGreaterThanOrEqual(1);
  });

  it('filters by type', async () => {
    const { tasks } = await repo.findAll({ type: 'create_app' });
    expect(tasks.every((t) => t.type === 'create_app')).toBe(true);
  });

  it('updates task status', async () => {
    const task = await repo.updateStatus(taskId, 'in_progress');
    expect(task.status).toBe('in_progress');
  });

  it('updates phase and progress', async () => {
    const task = await repo.updatePhase(taskId, 1, 25);
    expect(task.currentPhase).toBe(1);
    expect(task.progress).toBe(25);
  });

  it('deletes task', async () => {
    // Create a disposable task
    const temp = await repo.create({
      title: 'Temp',
      type: 'custom',
      description: 'Temporary',
      workspace: '/tmp/temp',
    });
    await repo.delete(temp.id);
    const found = await repo.findById(temp.id);
    expect(found).toBeNull();
  });
});

describe('ReviewRepository', () => {
  const taskRepo = new TaskRepository(prisma);
  const repo = new ReviewRepository(prisma);
  let taskId: string;

  beforeEach(async () => {
    const task = await taskRepo.create({
      title: 'Review Test',
      type: 'create_app',
      description: 'Testing reviews',
      workspace: '/projects/review-test',
    });
    taskId = task.id;
  });

  it('creates and retrieves a review', async () => {
    const review = await repo.create({
      taskId,
      phase: 1,
      deliverables: JSON.stringify([{ path: 'docs/planning/01_idea.md', size: 1000 }]),
    });
    expect(review.status).toBe('pending');
    expect(review.phase).toBe(1);

    const reviews = await repo.findByTaskId(taskId);
    expect(reviews.length).toBe(1);
  });

  it('updates review status', async () => {
    const review = await repo.create({
      taskId,
      phase: 1,
      deliverables: '[]',
    });
    const updated = await repo.updateStatus(review.id, 'approved', 'Looks good!');
    expect(updated.status).toBe('approved');
    expect(updated.feedback).toBe('Looks good!');
  });
});

describe('QuestionRepository', () => {
  const taskRepo = new TaskRepository(prisma);
  const repo = new QuestionRepository(prisma);
  let taskId: string;

  beforeEach(async () => {
    const task = await taskRepo.create({
      title: 'Question Test',
      type: 'create_app',
      description: 'Testing questions',
      workspace: '/projects/q-test',
    });
    taskId = task.id;
  });

  it('creates and answers a question', async () => {
    const q = await repo.create({
      taskId,
      category: 'business',
      question: 'What revenue model?',
      options: JSON.stringify(['Subscription', 'Freemium', 'Ad-based']),
    });
    expect(q.answer).toBeNull();

    const unanswered = await repo.findUnanswered(taskId);
    expect(unanswered.length).toBe(1);

    const answered = await repo.answer(q.id, 'Subscription');
    expect(answered.answer).toBe('Subscription');
    expect(answered.answeredAt).not.toBeNull();

    const remaining = await repo.findUnanswered(taskId);
    expect(remaining.length).toBe(0);
  });
});

describe('CheckpointRepository', () => {
  const taskRepo = new TaskRepository(prisma);
  const repo = new CheckpointRepository(prisma);
  let taskId: string;

  beforeEach(async () => {
    const task = await taskRepo.create({
      title: 'Checkpoint Test',
      type: 'custom',
      description: 'Testing checkpoints',
      workspace: '/projects/cp-test',
    });
    taskId = task.id;
  });

  it('creates and retrieves checkpoints', async () => {
    await repo.create({
      taskId,
      reason: 'interval',
      state: JSON.stringify({ currentPhase: 1, progress: 50 }),
    });
    await repo.create({
      taskId,
      reason: 'phase_complete',
      state: JSON.stringify({ currentPhase: 1, progress: 100 }),
    });

    const latest = await repo.findLatest(taskId);
    expect(latest).not.toBeNull();
    expect(latest!.reason).toBe('phase_complete');
  });
});

describe('SettingsRepository', () => {
  const repo = new SettingsRepository(prisma);

  it('sets and gets a setting', async () => {
    await repo.set('claude_model', 'claude-sonnet-4-5');
    const setting = await repo.get('claude_model');
    expect(setting).not.toBeNull();
    expect(setting!.value).toBe('claude-sonnet-4-5');
  });

  it('upserts existing setting', async () => {
    await repo.set('claude_model', 'claude-opus-4-6');
    const setting = await repo.get('claude_model');
    expect(setting!.value).toBe('claude-opus-4-6');
  });

  it('gets all settings', async () => {
    await repo.set('key1', 'value1');
    const all = await repo.getAll();
    expect(all.length).toBeGreaterThanOrEqual(1);
  });

  it('deletes a setting', async () => {
    await repo.set('temp_key', 'temp_val');
    await repo.delete('temp_key');
    const setting = await repo.get('temp_key');
    expect(setting).toBeNull();
  });
});

describe('LogRepository', () => {
  const taskRepo = new TaskRepository(prisma);
  const repo = new LogRepository(prisma);
  let taskId: string;

  beforeEach(async () => {
    const task = await taskRepo.create({
      title: 'Log Test',
      type: 'custom',
      description: 'Testing logs',
      workspace: '/projects/log-test',
    });
    taskId = task.id;
  });

  it('creates and retrieves logs', async () => {
    await repo.create({ taskId, level: 'info', message: 'Starting task' });
    await repo.create({ taskId, level: 'warn', message: 'Rate limit approaching' });

    const logs = await repo.findByTaskId(taskId);
    expect(logs.length).toBe(2);
    expect(logs[0].message).toBe('Starting task');
  });

  it('supports pagination', async () => {
    for (let i = 0; i < 5; i++) {
      await repo.create({ taskId, level: 'info', message: `Log ${i}` });
    }
    const logs = await repo.findByTaskId(taskId, { limit: 3, offset: 0 });
    expect(logs.length).toBe(3);
  });
});
