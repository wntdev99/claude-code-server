import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { PrismaClient } from '@prisma/client';
import path from 'path';
import { TaskRepository } from '../repositories/TaskRepository.js';
import { ReviewRepository } from '../repositories/ReviewRepository.js';
import { QuestionRepository } from '../repositories/QuestionRepository.js';
import { CheckpointRepository } from '../repositories/CheckpointRepository.js';
import { SettingsRepository } from '../repositories/SettingsRepository.js';
import { LogRepository } from '../repositories/LogRepository.js';

const dbPath = path.resolve(__dirname, '../../prisma/dev.db');
const prisma = new PrismaClient({
  datasources: { db: { url: `file:${dbPath}` } },
});

// Track IDs for isolated cleanup
const createdTaskIds: string[] = [];
const createdSettingsKeys: string[] = [];

afterAll(async () => {
  for (const id of createdTaskIds) {
    await prisma.log.deleteMany({ where: { taskId: id } });
    await prisma.checkpoint.deleteMany({ where: { taskId: id } });
    await prisma.question.deleteMany({ where: { taskId: id } });
    await prisma.review.deleteMany({ where: { taskId: id } });
    await prisma.task.delete({ where: { id } }).catch(() => {});
  }
  for (const key of createdSettingsKeys) {
    await prisma.settings.delete({ where: { key } }).catch(() => {});
  }
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
    createdTaskIds.push(taskId);
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

  it('returns null for non-existent task id', async () => {
    const task = await repo.findById('non-existent-id-12345');
    expect(task).toBeNull();
  });

  it('filters by status', async () => {
    const { tasks } = await repo.findAll({ status: 'draft' });
    expect(tasks.every((t) => t.status === 'draft')).toBe(true);
  });

  it('filters by type and status combined', async () => {
    const { tasks } = await repo.findAll({ type: 'create_app', status: 'in_progress' });
    expect(tasks.every((t) => t.type === 'create_app' && t.status === 'in_progress')).toBe(true);
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
    createdTaskIds.push(taskId);
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

  it('findByTaskId returns empty array for non-existent task', async () => {
    const reviews = await repo.findByTaskId('non-existent-task');
    expect(reviews).toEqual([]);
  });

  it('stores and retrieves deliverables as JSON', async () => {
    const deliverables = [
      { path: 'src/index.ts', size: 500 },
      { path: 'src/app.tsx', size: 1200 },
    ];
    const review = await repo.create({
      taskId,
      phase: 2,
      deliverables: JSON.stringify(deliverables),
    });
    const parsed = JSON.parse(review.deliverables);
    expect(parsed).toHaveLength(2);
    expect(parsed[0].path).toBe('src/index.ts');
  });

  it('handles changes_requested with feedback', async () => {
    const review = await repo.create({
      taskId,
      phase: 1,
      deliverables: '[]',
    });
    const updated = await repo.updateStatus(
      review.id,
      'changes_requested',
      'Please add more detail to section 3'
    );
    expect(updated.status).toBe('changes_requested');
    expect(updated.feedback).toBe('Please add more detail to section 3');
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
    createdTaskIds.push(taskId);
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

  it('stores options as JSON and retrieves correctly', async () => {
    const opts = ['React', 'Vue', 'Angular'];
    const q = await repo.create({
      taskId,
      category: 'choice',
      question: 'Which framework?',
      options: JSON.stringify(opts),
    });
    expect(JSON.parse(q.options as string)).toEqual(opts);
  });

  it('creates multiple questions per task', async () => {
    await repo.create({ taskId, category: 'business', question: 'Q1?', options: '[]' });
    await repo.create({ taskId, category: 'clarification', question: 'Q2?', options: '[]' });
    const all = await repo.findByTaskId(taskId);
    expect(all.length).toBeGreaterThanOrEqual(2);
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
    createdTaskIds.push(taskId);
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

  it('findLatest returns null when no checkpoints exist', async () => {
    const latest = await repo.findLatest('no-checkpoints-task');
    expect(latest).toBeNull();
  });

  it('stores and parses state JSON correctly', async () => {
    const state = { currentPhase: 2, progress: 75, lastOutput: 'working...' };
    const cp = await repo.create({
      taskId,
      reason: 'manual',
      state: JSON.stringify(state),
    });
    const parsed = JSON.parse(cp.state as string);
    expect(parsed.currentPhase).toBe(2);
    expect(parsed.progress).toBe(75);
    expect(parsed.lastOutput).toBe('working...');
  });
});

describe('SettingsRepository', () => {
  const repo = new SettingsRepository(prisma);

  it('sets and gets a setting', async () => {
    createdSettingsKeys.push('claude_model');
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
    createdSettingsKeys.push('key1');
    await repo.set('key1', 'value1');
    const all = await repo.getAll();
    expect(all.length).toBeGreaterThanOrEqual(1);
  });

  it('deletes a setting', async () => {
    createdSettingsKeys.push('temp_key');
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
    createdTaskIds.push(taskId);
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

  it('deletes all logs for a task', async () => {
    await repo.create({ taskId, level: 'info', message: 'msg1' });
    await repo.create({ taskId, level: 'info', message: 'msg2' });
    await repo.deleteByTaskId(taskId);
    const logs = await repo.findByTaskId(taskId);
    expect(logs.length).toBe(0);
  });

  it('creates log with metadata', async () => {
    const meta = JSON.stringify({ tokens: 1500, phase: 1 });
    const log = await repo.create({ taskId, level: 'info', message: 'with meta', metadata: meta });
    expect(log.metadata).toBe(meta);
  });
});
