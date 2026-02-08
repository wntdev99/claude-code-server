import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { AgentManager } from '@claude-code-server/agent-manager';
import { ensureWorkspace, getWorkspacePath } from '@claude-code-server/shared';

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
    // Ensure workspace directory exists
    const workspace = ensureWorkspace(id);

    // Update task with actual workspace path and set status
    await prisma.task.update({
      where: { id },
      data: { status: 'in_progress', workspace },
    });

    // Start agent execution
    const agentManager = AgentManager.getInstance();

    // Persist logs to DB
    agentManager.on(`log:${id}`, async (message: string) => {
      try {
        await prisma.log.create({
          data: { taskId: id, level: 'info', message },
        });
      } catch {
        // Don't let log persistence failures stop execution
      }
    });

    // Handle protocol events
    agentManager.on(`protocol:${id}`, async (protocol: { type: string; [key: string]: unknown }) => {
      try {
        if (protocol.type === 'USER_QUESTION') {
          await prisma.question.create({
            data: {
              taskId: id,
              category: (protocol.category as string) || 'clarification',
              question: protocol.question as string,
              options: JSON.stringify(protocol.options || []),
            },
          });
        } else if (protocol.type === 'PHASE_COMPLETE') {
          await prisma.review.create({
            data: {
              taskId: id,
              phase: protocol.phase as number,
              status: 'pending',
              deliverables: JSON.stringify(protocol.documents || []),
            },
          });
          await prisma.task.update({
            where: { id },
            data: { currentPhase: protocol.phase as number, status: 'review' },
          });
        }
      } catch {
        // Don't let protocol persistence failures stop execution
      }
    });

    // Listen for completion
    agentManager.once(`exit:${id}`, async (code: number | null) => {
      const finalStatus = code === 0 ? 'completed' : 'failed';
      try {
        await prisma.task.update({
          where: { id },
          data: { status: finalStatus, progress: code === 0 ? 100 : undefined },
        });
      } catch {
        // Best effort
      }
      // Clean up listeners
      agentManager.removeAllListeners(`log:${id}`);
      agentManager.removeAllListeners(`protocol:${id}`);
    });

    await agentManager.executeTask(id, task.description, {
      workspace,
      env: {
        TASK_TYPE: task.type,
        TASK_TITLE: task.title,
      },
    });

    return NextResponse.json({ success: true, data: { status: 'in_progress' } });
  } catch (error) {
    await prisma.task.update({
      where: { id },
      data: { status: 'failed' },
    }).catch(() => {});

    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to execute task',
      },
      { status: 500 }
    );
  }
}
