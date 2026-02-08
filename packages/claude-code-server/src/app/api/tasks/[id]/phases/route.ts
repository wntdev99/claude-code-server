import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getWorkflowDefinition } from '@claude-code-server/agent-manager';

type RouteContext = { params: Promise<{ id: string }> };

// GET /api/tasks/:id/phases - Get phase definitions for a task
export async function GET(_req: NextRequest, context: RouteContext) {
  const { id } = await context.params;

  const task = await prisma.task.findUnique({ where: { id } });
  if (!task) {
    return NextResponse.json(
      { success: false, error: 'Task not found' },
      { status: 404 }
    );
  }

  try {
    const workflow = getWorkflowDefinition(task.type);
    return NextResponse.json({
      success: true,
      data: {
        taskType: task.type,
        currentPhase: task.currentPhase,
        totalPhases: workflow.phases.length,
        phases: workflow.phases.map((p) => ({
          phase: p.phase,
          name: p.name,
          steps: p.steps,
          deliverableDir: p.deliverableDir || null,
          expectedDeliverables: p.expectedDeliverables,
          status:
            task.currentPhase === null
              ? 'pending'
              : p.phase < (task.currentPhase ?? 0)
                ? 'completed'
                : p.phase === task.currentPhase
                  ? 'in_progress'
                  : 'pending',
        })),
      },
    });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
