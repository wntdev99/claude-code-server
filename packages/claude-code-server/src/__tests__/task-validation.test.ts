import { describe, it, expect, afterAll } from 'vitest';
import { PrismaClient } from '@prisma/client';
import { z } from 'zod';
import path from 'path';
import { sanitizeInput } from '@claude-code-server/shared';

/**
 * Task validation tests - validates the Zod schema and sanitization logic
 * used by the task creation API route.
 */

const CreateTaskSchema = z.object({
  title: z.string().min(1, 'Title is required'),
  type: z.enum(['create_app', 'modify_app', 'workflow', 'custom']),
  description: z.string().min(10, 'Description must be at least 10 characters'),
});

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

describe('Task creation validation (Zod schema)', () => {
  it('validates a correct create_app task', () => {
    const input = {
      title: 'My App',
      type: 'create_app',
      description: 'Build a todo app with React and Node.js',
    };
    const result = CreateTaskSchema.safeParse(input);
    expect(result.success).toBe(true);
  });

  it('rejects empty title', () => {
    const input = {
      title: '',
      type: 'custom',
      description: 'Some description text here',
    };
    const result = CreateTaskSchema.safeParse(input);
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.errors.some((e) => e.message.includes('Title'))).toBe(true);
    }
  });

  it('rejects short description', () => {
    const input = {
      title: 'App',
      type: 'custom',
      description: 'Short',
    };
    const result = CreateTaskSchema.safeParse(input);
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.errors.some((e) => e.message.includes('10 characters'))).toBe(true);
    }
  });

  it('rejects invalid task type', () => {
    const input = {
      title: 'App',
      type: 'invalid_type',
      description: 'Build something great',
    };
    const result = CreateTaskSchema.safeParse(input);
    expect(result.success).toBe(false);
  });

  it('accepts all valid task types', () => {
    for (const type of ['create_app', 'modify_app', 'workflow', 'custom']) {
      const result = CreateTaskSchema.safeParse({
        title: 'Test',
        type,
        description: 'A valid description',
      });
      expect(result.success).toBe(true);
    }
  });

  it('rejects missing fields', () => {
    expect(CreateTaskSchema.safeParse({}).success).toBe(false);
    expect(CreateTaskSchema.safeParse({ title: 'Only title' }).success).toBe(false);
  });
});

describe('Task sanitization', () => {
  it('sanitizes title with HTML tags', () => {
    const sanitized = sanitizeInput('<script>alert("xss")</script>Todo App');
    expect(sanitized).not.toContain('<script>');
    expect(sanitized).toContain('Todo App');
  });

  it('sanitizes description with null bytes', () => {
    const sanitized = sanitizeInput('Build an app\0with injection');
    expect(sanitized).not.toContain('\0');
  });

  it('trims whitespace', () => {
    const sanitized = sanitizeInput('  My App  ');
    expect(sanitized).toBe('My App');
  });
});

describe('Task CRUD with DB', () => {
  it('creates task with sanitized title in DB', async () => {
    const title = sanitizeInput('  Test App  ');
    const task = await prisma.task.create({
      data: {
        title,
        type: 'custom',
        description: 'A test task for validation',
        status: 'draft',
        workspace: '',
      },
    });
    createdTaskIds.push(task.id);
    expect(task.title).toBe('Test App');
    expect(task.status).toBe('draft');
    expect(task.progress).toBe(0);
    expect(task.currentPhase).toBeNull();
  });

  it('returns null for non-existent task ID', async () => {
    const task = await prisma.task.findUnique({ where: { id: 'nonexistent-id-xyz' } });
    expect(task).toBeNull();
  });

  it('lists tasks with pagination', async () => {
    // Create 3 tasks
    for (let i = 0; i < 3; i++) {
      const t = await prisma.task.create({
        data: {
          title: `Pagination Test ${i}`,
          type: 'custom',
          description: `Pagination task ${i}`,
          status: 'draft',
          workspace: '',
        },
      });
      createdTaskIds.push(t.id);
    }

    const page1 = await prisma.task.findMany({
      where: { title: { contains: 'Pagination Test' } },
      take: 2,
      skip: 0,
    });
    expect(page1.length).toBeLessThanOrEqual(2);

    const total = await prisma.task.count({
      where: { title: { contains: 'Pagination Test' } },
    });
    expect(total).toBeGreaterThanOrEqual(3);
  });

  it('filters tasks by status', async () => {
    const t = await prisma.task.create({
      data: {
        title: 'In-progress filter test',
        type: 'custom',
        description: 'Testing status filter',
        status: 'in_progress',
        workspace: '',
      },
    });
    createdTaskIds.push(t.id);

    const filtered = await prisma.task.findMany({
      where: { status: 'in_progress' },
    });
    expect(filtered.every((task) => task.status === 'in_progress')).toBe(true);
  });

  it('cascade deletes related records', async () => {
    const task = await prisma.task.create({
      data: {
        title: 'Cascade Test',
        type: 'custom',
        description: 'Test cascade delete',
        status: 'draft',
        workspace: '',
      },
    });

    // Create related records
    await prisma.log.create({ data: { taskId: task.id, level: 'info', message: 'test log' } });
    await prisma.question.create({
      data: { taskId: task.id, category: 'test', question: 'Q?', options: '[]' },
    });
    await prisma.review.create({
      data: { taskId: task.id, phase: 1, status: 'pending', deliverables: '[]' },
    });

    // Delete task
    await prisma.task.delete({ where: { id: task.id } });

    // Verify cascade
    expect(await prisma.log.count({ where: { taskId: task.id } })).toBe(0);
    expect(await prisma.question.count({ where: { taskId: task.id } })).toBe(0);
    expect(await prisma.review.count({ where: { taskId: task.id } })).toBe(0);
  });
});
