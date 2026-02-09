import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { AgentManager } from '@claude-code-server/agent-manager';
import { sanitizeInput } from '@claude-code-server/shared';

type RouteContext = { params: Promise<{ id: string }> };

// POST /api/reviews/:id/request-changes - Request changes on a review
export async function POST(req: NextRequest, context: RouteContext) {
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

  let feedback = '';
  try {
    const body = await req.json();
    feedback = body.feedback || '';
  } catch {
    // No body is OK, but feedback is recommended
  }

  feedback = sanitizeInput(feedback);

  if (!feedback.trim()) {
    return NextResponse.json(
      { success: false, error: 'Feedback is required when requesting changes' },
      { status: 400 }
    );
  }

  try {
    // Update review status and save feedback
    await prisma.review.update({
      where: { id },
      data: {
        status: 'changes_requested',
        feedback,
      },
    });

    // Set task back to in_progress for rework
    await prisma.task.update({
      where: { id: review.taskId },
      data: { status: 'in_progress' },
    });

    // Request rework via AgentManager (respawns agent with feedback in prompt)
    const agentManager = AgentManager.getInstance();
    try {
      await agentManager.requestRework(review.taskId, feedback);
    } catch {
      // Agent might not be running - that's OK
    }

    return NextResponse.json({
      success: true,
      data: { reviewId: id, status: 'changes_requested', feedback },
    });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to request changes',
      },
      { status: 500 }
    );
  }
}
