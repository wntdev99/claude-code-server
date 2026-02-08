import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { AgentManager } from '@claude-code-server/agent-manager';

type RouteContext = { params: Promise<{ id: string }> };

// POST /api/tasks/:id/pause
export async function POST(_req: NextRequest, context: RouteContext) {
  const { id } = await context.params;

  try {
    const agentManager = AgentManager.getInstance();
    agentManager.pause(id);

    await prisma.task.update({
      where: { id },
      data: { status: 'paused' },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to pause',
      },
      { status: 500 }
    );
  }
}
