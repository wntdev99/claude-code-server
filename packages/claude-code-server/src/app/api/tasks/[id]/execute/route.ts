import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import {
  AgentManager,
  WorkflowEngine,
  DeliverableCollector,
  VerificationAgent,
  getPhaseDefinition,
  hasReviewGate,
  isLastPhase,
  getTotalPhases,
} from '@claude-code-server/agent-manager';
import { ensureWorkspace } from '@claude-code-server/shared';

type RouteContext = { params: Promise<{ id: string }> };

// POST /api/tasks/:id/execute - Start task execution
export async function POST(req: NextRequest, context: RouteContext) {
  const { id } = await context.params;

  const task = await prisma.task.findUnique({ where: { id } });
  if (!task) {
    return NextResponse.json(
      { success: false, error: 'Task not found' },
      { status: 404 }
    );
  }

  if (task.status !== 'draft' && task.status !== 'pending') {
    return NextResponse.json(
      { success: false, error: `Cannot execute task in ${task.status} status` },
      { status: 400 }
    );
  }

  try {
    // Ensure workspace directory exists
    const workspace = ensureWorkspace(id);

    // Update task with actual workspace path and set status
    await prisma.task.update({
      where: { id },
      data: { status: 'in_progress', workspace },
    });

    // Start agent execution
    const agentManager = AgentManager.getInstance();

    // Persist logs to DB
    agentManager.on(`log:${id}`, async (message: string) => {
      try {
        await prisma.log.create({
          data: { taskId: id, level: 'info', message },
        });
      } catch {
        // Don't let log persistence failures stop execution
      }
    });

    // Handle protocol events
    const collector = new DeliverableCollector();
    const verifier = new VerificationAgent();

    agentManager.on(`protocol:${id}`, async (protocol: { type: string; [key: string]: unknown }) => {
      try {
        if (protocol.type === 'USER_QUESTION') {
          await prisma.question.create({
            data: {
              taskId: id,
              category: (protocol.category as string) || 'clarification',
              question: protocol.question as string,
              options: JSON.stringify(protocol.options || []),
            },
          });
        } else if (protocol.type === 'CUSTOM_TASK_COMPLETE') {
          // Custom task completed - mark as done
          await prisma.task.update({
            where: { id },
            data: { status: 'completed', progress: 100 },
          });
        } else if (protocol.type === 'PHASE_COMPLETE') {
          const phase = protocol.phase as number;
          const taskType = task.type;

          // Collect deliverables from workspace
          let deliverables: { path: string; content: string; size: number }[] = [];
          try {
            const phaseDef = getPhaseDefinition(taskType, phase);
            if (phaseDef.deliverableDir) {
              deliverables = collector.collect(workspace, phaseDef.deliverableDir);
            }

            // Run verification for structured workflows
            if (hasReviewGate(taskType)) {
              const result = verifier.verify(deliverables, phaseDef);
              if (!result.passed && verifier.shouldAutoRework(result)) {
                // Auto-rework: send feedback to agent and let it retry
                const feedback = verifier.generateFeedback(result);
                agentManager.requestRework(id, feedback);
                await prisma.log.create({
                  data: {
                    taskId: id,
                    level: 'warn',
                    message: `[verification] Auto-rework triggered: ${feedback}`,
                  },
                });
                return; // Don't create review yet
              }
            }
          } catch {
            // Verification failure shouldn't block review creation
          }

          // Create review with collected deliverables
          const deliverableSummary = deliverables.map((d) => ({
            path: d.path,
            size: d.size,
          }));

          await prisma.review.create({
            data: {
              taskId: id,
              phase,
              status: 'pending',
              deliverables: JSON.stringify(deliverableSummary),
            },
          });
          await prisma.task.update({
            where: { id },
            data: { currentPhase: phase, status: 'review' },
          });
        }
      } catch {
        // Don't let protocol persistence failures stop execution
      }
    });

    // Cleanup function to remove all listeners for this task
    const cleanup = () => {
      agentManager.removeAllListeners(`log:${id}`);
      agentManager.removeAllListeners(`protocol:${id}`);
      agentManager.removeAllListeners(`exit:${id}`);
    };

    // Listen for completion
    agentManager.once(`exit:${id}`, async (code: number | null) => {
      const finalStatus = code === 0 ? 'completed' : 'failed';
      try {
        await prisma.task.update({
          where: { id },
          data: { status: finalStatus, progress: code === 0 ? 100 : undefined },
        });
      } catch {
        // Best effort
      }
      cleanup();
    });

    // Clean up listeners if the HTTP request is aborted
    req.signal.addEventListener('abort', () => {
      cleanup();
    });

    // Execute based on task type
    if (task.type === 'custom') {
      // Custom: direct single-phase execution
      await agentManager.executeTask(id, task.description, {
        workspace,
        env: {
          TASK_TYPE: task.type,
          TASK_TITLE: task.title,
        },
      });
    } else {
      // Structured workflows: use WorkflowEngine for phase-based execution
      const workflowEngine = new WorkflowEngine(agentManager);
      const startPhase = task.currentPhase || 1;
      const guideRoot = process.env.GUIDE_ROOT || process.cwd();

      await workflowEngine.executePhase(
        {
          taskId: id,
          taskType: task.type,
          title: task.title,
          description: task.description,
          workspace,
          guideRoot,
        },
        startPhase
      );
    }

    return NextResponse.json({ success: true, data: { status: 'in_progress' } });
  } catch (error) {
    await prisma.task.update({
      where: { id },
      data: { status: 'failed' },
    }).catch(() => {});

    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to execute task',
      },
      { status: 500 }
    );
  }
}
