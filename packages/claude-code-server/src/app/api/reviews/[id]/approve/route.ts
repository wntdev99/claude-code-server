import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import {
  AgentManager,
  WorkflowEngine,
  getPhaseDefinition,
  getTotalPhases,
} from '@claude-code-server/agent-manager';

type RouteContext = { params: Promise<{ id: string }> };

// POST /api/reviews/:id/approve - Approve a review and advance to next phase
export async function POST(_req: NextRequest, context: RouteContext) {
  const { id } = await context.params;

  const review = await prisma.review.findUnique({
    where: { id },
    include: { task: true },
  });

  if (!review) {
    return NextResponse.json(
      { success: false, error: 'Review not found' },
      { status: 404 }
    );
  }

  if (review.status !== 'pending' && review.status !== 'in_review') {
    return NextResponse.json(
      { success: false, error: `Review already ${review.status}` },
      { status: 400 }
    );
  }

  try {
    // Update review status
    await prisma.review.update({
      where: { id },
      data: { status: 'approved' },
    });

    const totalPhases = getTotalPhases(review.task.type);
    const lastPhase = review.phase >= totalPhases;

    if (lastPhase) {
      // Final phase approved - mark task as completed
      await prisma.task.update({
        where: { id: review.taskId },
        data: {
          status: 'completed',
          currentPhase: review.phase,
          progress: 100,
        },
      });

      // Resume agent so it exits naturally
      const agentManager = AgentManager.getInstance();
      try {
        await agentManager.approveReview(review.taskId);
      } catch {
        // Agent might not be running (e.g., server restart) - that's OK
      }
    } else {
      // Advance to next phase - spawn new agent with next phase prompt
      const nextPhase = review.phase + 1;
      await prisma.task.update({
        where: { id: review.taskId },
        data: {
          status: 'in_progress',
          currentPhase: nextPhase,
          progress: Math.round((nextPhase / totalPhases) * 100),
        },
      });

      const agentManager = AgentManager.getInstance();
      try {
        // Build next phase prompt
        const workflowEngine = new WorkflowEngine(agentManager);
        const guideRoot = process.env.GUIDE_ROOT || process.cwd();
        const phaseDef = getPhaseDefinition(review.task.type, nextPhase);

        const nextPhasePrompt = workflowEngine.buildPhasePrompt(
          {
            taskId: review.taskId,
            taskType: review.task.type,
            title: review.task.title,
            description: review.task.description,
            workspace: review.task.workspace,
            guideRoot,
          },
          phaseDef
        );

        // Respawn agent with next phase prompt
        await agentManager.approveReview(review.taskId, nextPhasePrompt, {
          workspace: review.task.workspace,
          env: {
            TASK_TYPE: review.task.type,
            TASK_TITLE: review.task.title,
            CURRENT_PHASE: String(nextPhase),
            PHASE_NAME: phaseDef.name,
          },
        });
      } catch {
        // Agent might not be running - that's OK, DB is updated
      }
    }

    const nextPhase = lastPhase ? null : review.phase + 1;
    return NextResponse.json({
      success: true,
      data: { reviewId: id, status: 'approved', nextPhase, completed: lastPhase },
    });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to approve review',
      },
      { status: 500 }
    );
  }
}
