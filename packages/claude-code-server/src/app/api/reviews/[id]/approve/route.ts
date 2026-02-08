import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { AgentManager, getTotalPhases } from '@claude-code-server/agent-manager';

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
    } else {
      // Advance to next phase
      const nextPhase = review.phase + 1;
      await prisma.task.update({
        where: { id: review.taskId },
        data: {
          status: 'in_progress',
          currentPhase: nextPhase,
          progress: Math.round((nextPhase / totalPhases) * 100),
        },
      });
    }

    // Resume agent via AgentManager
    const agentManager = AgentManager.getInstance();
    try {
      agentManager.approveReview(review.taskId);
    } catch {
      // Agent might not be running (e.g., server restart) - that's OK
      // The task status update still persists
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
