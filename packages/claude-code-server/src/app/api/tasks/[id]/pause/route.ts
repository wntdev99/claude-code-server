import { NextRequest, NextResponse } from 'next/server';
import { AgentManager } from '@claude-code-server/agent-manager';

type RouteContext = { params: Promise<{ id: string }> };

// POST /api/tasks/:id/pause
export async function POST(_req: NextRequest, context: RouteContext) {
  const { id } = await context.params;

  try {
    const agentManager = AgentManager.getInstance();
    agentManager.pause(id);

    // Task status stays 'in_progress' - pause is an agent-level state
    // The agent state (AgentState) transitions to 'paused' inside AgentManager

    return NextResponse.json({ success: true, data: { agentState: 'paused' } });
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
