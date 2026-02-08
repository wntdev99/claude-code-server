import { NextRequest, NextResponse } from 'next/server';
import { AgentManager } from '@claude-code-server/agent-manager';

type RouteContext = { params: Promise<{ id: string }> };

// POST /api/tasks/:id/resume
export async function POST(_req: NextRequest, context: RouteContext) {
  const { id } = await context.params;

  try {
    const agentManager = AgentManager.getInstance();
    agentManager.resume(id);

    // Task status stays 'in_progress' - resume is an agent-level state change
    // The agent state (AgentState) transitions back to 'running' inside AgentManager

    return NextResponse.json({ success: true, data: { agentState: 'running' } });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to resume',
      },
      { status: 500 }
    );
  }
}
