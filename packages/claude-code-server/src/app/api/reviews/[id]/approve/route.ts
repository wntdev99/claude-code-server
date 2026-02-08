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

    // Update task: advance phase and set back to in_progress
    const nextPhase = review.phase + 1;
    await prisma.task.update({
      where: { id: review.taskId },
      data: {
        status: 'in_progress',
        currentPhase: nextPhase,
        progress: Math.round((review.phase / getTotalPhases(review.task.type)) * 100),
      },
    });

    // Resume agent via AgentManager
    const agentManager = AgentManager.getInstance();
    try {
      agentManager.approveReview(review.taskId);
    } catch {
      // Agent might not be running (e.g., server restart) - that's OK
      // The task status update still persists
    }

    return NextResponse.json({
      success: true,
      data: { reviewId: id, status: 'approved', nextPhase },
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
