import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { z } from 'zod';
import { sanitizeInput } from '@claude-code-server/shared';

const CreateTaskSchema = z.object({
  title: z.string().min(1, 'Title is required'),
  type: z.enum(['create_app', 'modify_app', 'workflow', 'custom']),
  description: z.string().min(10, 'Description must be at least 10 characters'),
});

// POST /api/tasks - Create a new task
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const validated = CreateTaskSchema.parse(body);

    const task = await prisma.task.create({
      data: {
        title: sanitizeInput(validated.title),
        type: validated.type,
        description: sanitizeInput(validated.description),
        status: 'draft',
        workspace: '', // Will be set on execute
      },
    });

    return NextResponse.json({ success: true, data: task }, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { success: false, error: error.errors.map((e) => e.message).join(', ') },
        { status: 400 }
      );
    }
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// GET /api/tasks - List tasks with optional filtering
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = req.nextUrl;
    const status = searchParams.get('status');
    const type = searchParams.get('type');
    const page = parseInt(searchParams.get('page') ?? '1', 10);
    const pageSize = parseInt(searchParams.get('pageSize') ?? '20', 10);

    const where: Record<string, string> = {};
    if (status) where.status = status;
    if (type) where.type = type;

    const [tasks, total] = await Promise.all([
      prisma.task.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      prisma.task.count({ where }),
    ]);

    return NextResponse.json({
      success: true,
      data: tasks,
      pagination: {
        page,
        pageSize,
        total,
        totalPages: Math.ceil(total / pageSize),
      },
    });
  } catch {
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}
