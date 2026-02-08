import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { AgentManager } from '@claude-code-server/agent-manager';

type RouteContext = { params: Promise<{ id: string }> };

// POST /api/tasks/:id/execute - Start task execution
export async function POST(_req: NextRequest, context: RouteContext) {
  const { id } = await context.params;

  const task = await prisma.task.findUnique({ where: { id } });
  if (!task) {
    return NextResponse.json(
      { success: false, error: 'Task not found' },
      { status: 404 }
    );
  }

  if (task.status !== 'draft' && task.status !== 'pending') {
    return NextResponse.json(
      { success: false, error: `Cannot execute task in ${task.status} status` },
      { status: 400 }
    );
  }

  try {
    // Update status to in_progress
    await prisma.task.update({
      where: { id },
      data: { status: 'in_progress' },
    });

    // Start agent execution
    const agentManager = AgentManager.getInstance();
    await agentManager.executeTask(id, task.description, {
      workspace: task.workspace,
      env: {
        TASK_TYPE: task.type,
        TASK_TITLE: task.title,
      },
    });

    // Listen for completion
    agentManager.once(`exit:${id}`, async (code: number | null) => {
      const finalStatus = code === 0 ? 'completed' : 'failed';
      await prisma.task.update({
        where: { id },
        data: { status: finalStatus, progress: code === 0 ? 100 : undefined },
      });
    });

    return NextResponse.json({ success: true, data: { status: 'in_progress' } });
  } catch (error) {
    await prisma.task.update({
      where: { id },
      data: { status: 'failed' },
    });

    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to execute task',
      },
      { status: 500 }
    );
  }
}
