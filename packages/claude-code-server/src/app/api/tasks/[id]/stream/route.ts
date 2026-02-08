import { NextRequest } from 'next/server';
import { AgentManager } from '@claude-code-server/agent-manager';
import { SSE_HEARTBEAT_INTERVAL_MS } from '@claude-code-server/shared';

type RouteContext = { params: Promise<{ id: string }> };

// GET /api/tasks/:id/stream - SSE log streaming endpoint
export async function GET(req: NextRequest, context: RouteContext) {
  const { id } = await context.params;
  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    start(controller) {
      const agentManager = AgentManager.getInstance();

      // Send log events
      const logListener = (message: string) => {
        const data = JSON.stringify({
          type: 'log',
          content: message,
          timestamp: new Date().toISOString(),
        });
        controller.enqueue(encoder.encode(`data: ${data}\n\n`));
      };

      // Send state change events
      const stateListener = (state: string) => {
        const data = JSON.stringify({
          type: 'state',
          content: state,
          timestamp: new Date().toISOString(),
        });
        controller.enqueue(encoder.encode(`data: ${data}\n\n`));
      };

      // Send exit event
      const exitListener = (code: number | null) => {
        const data = JSON.stringify({
          type: 'complete',
          content: { exitCode: code },
          timestamp: new Date().toISOString(),
        });
        controller.enqueue(encoder.encode(`data: ${data}\n\n`));
        cleanup();
      };

      // Heartbeat to keep connection alive
      const heartbeat = setInterval(() => {
        try {
          controller.enqueue(encoder.encode(': heartbeat\n\n'));
        } catch {
          cleanup();
        }
      }, SSE_HEARTBEAT_INTERVAL_MS);

      agentManager.on(`log:${id}`, logListener);
      agentManager.on(`state:${id}`, stateListener);
      agentManager.on(`exit:${id}`, exitListener);

      function cleanup() {
        clearInterval(heartbeat);
        agentManager.off(`log:${id}`, logListener);
        agentManager.off(`state:${id}`, stateListener);
        agentManager.off(`exit:${id}`, exitListener);
        try {
          controller.close();
        } catch {
          // Already closed
        }
      }

      // Clean up when client disconnects
      req.signal.addEventListener('abort', cleanup);
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive',
    },
  });
}
