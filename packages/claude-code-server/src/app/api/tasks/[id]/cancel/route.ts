import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { AgentManager } from '@claude-code-server/agent-manager';

type RouteContext = { params: Promise<{ id: string }> };

// POST /api/tasks/:id/cancel - Cancel a running task
export async function POST(_req: NextRequest, context: RouteContext) {
  const { id } = await context.params;

  const task = await prisma.task.findUnique({ where: { id } });
  if (!task) {
    return NextResponse.json(
      { success: false, error: 'Task not found' },
      { status: 404 }
    );
  }

  if (task.status !== 'in_progress' && task.status !== 'review') {
    return NextResponse.json(
      { success: false, error: `Cannot cancel task in ${task.status} status` },
      { status: 400 }
    );
  }

  try {
    const agentManager = AgentManager.getInstance();
    await agentManager.terminate(id);

    await prisma.task.update({
      where: { id },
      data: { status: 'failed' },
    });

    return NextResponse.json({ success: true, data: { status: 'cancelled' } });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to cancel task',
      },
      { status: 500 }
    );
  }
}
