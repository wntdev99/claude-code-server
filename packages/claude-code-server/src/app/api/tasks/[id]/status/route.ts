import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { AgentManager } from '@claude-code-server/agent-manager';

type RouteContext = { params: Promise<{ id: string }> };

// GET /api/tasks/:id/status - Get real-time agent status
export async function GET(_req: NextRequest, context: RouteContext) {
  const { id } = await context.params;

  const task = await prisma.task.findUnique({ where: { id } });
  if (!task) {
    return NextResponse.json(
      { success: false, error: 'Task not found' },
      { status: 404 }
    );
  }

  const agentManager = AgentManager.getInstance();
  const agentState = agentManager.getState(id);
  const tokenUsage = agentManager.tokenTracker.getUsage(id);

  return NextResponse.json({
    success: true,
    data: {
      taskId: id,
      taskStatus: task.status,
      agentState: agentState ?? 'not_running',
      currentPhase: task.currentPhase,
      progress: task.progress,
      tokenUsage: tokenUsage ?? { inputTokens: 0, outputTokens: 0, totalTokens: 0, estimatedCost: 0 },
    },
  });
}
