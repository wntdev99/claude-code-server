import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { sanitizeInput } from '@claude-code-server/shared';
import { z } from 'zod';

type RouteContext = { params: Promise<{ id: string }> };

// GET /api/tasks/:id
export async function GET(_req: NextRequest, context: RouteContext) {
  const { id } = await context.params;
  const task = await prisma.task.findUnique({
    where: { id },
    include: {
      reviews: { orderBy: { createdAt: 'desc' } },
      questions: { orderBy: { createdAt: 'desc' } },
      checkpoints: { orderBy: { createdAt: 'desc' }, take: 5 },
    },
  });

  if (!task) {
    return NextResponse.json(
      { success: false, error: 'Task not found' },
      { status: 404 }
    );
  }

  return NextResponse.json({ success: true, data: task });
}

const UpdateTaskSchema = z.object({
  title: z.string().min(1).optional(),
  description: z.string().min(10).optional(),
  status: z
    .enum(['draft', 'pending', 'in_progress', 'review', 'completed', 'failed'])
    .optional(),
});

// PATCH /api/tasks/:id
export async function PATCH(req: NextRequest, context: RouteContext) {
  const { id } = await context.params;

  try {
    const body = await req.json();
    const validated = UpdateTaskSchema.parse(body);

    const sanitized: Record<string, string> = {};
    if (validated.title) sanitized.title = sanitizeInput(validated.title);
    if (validated.description) sanitized.description = sanitizeInput(validated.description);
    if (validated.status) sanitized.status = validated.status;

    const task = await prisma.task.update({
      where: { id },
      data: sanitized,
    });

    return NextResponse.json({ success: true, data: task });
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

// DELETE /api/tasks/:id
export async function DELETE(_req: NextRequest, context: RouteContext) {
  const { id } = await context.params;

  try {
    await prisma.task.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json(
      { success: false, error: 'Task not found' },
      { status: 404 }
    );
  }
}
