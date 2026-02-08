import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { AgentManager } from '@claude-code-server/agent-manager';
import { sanitizeInput } from '@claude-code-server/shared';
import { z } from 'zod';

type RouteContext = { params: Promise<{ id: string }> };

const AnswerSchema = z.object({
  answer: z.string().min(1, 'Answer is required'),
});

// POST /api/questions/:id/answer
export async function POST(req: NextRequest, context: RouteContext) {
  const { id } = await context.params;

  try {
    const body = await req.json();
    const { answer } = AnswerSchema.parse(body);

    const sanitizedAnswer = sanitizeInput(answer);

    const question = await prisma.question.update({
      where: { id },
      data: { answer: sanitizedAnswer, answeredAt: new Date() },
    });

    // Send answer to the agent
    const agentManager = AgentManager.getInstance();
    agentManager.sendAnswer(question.taskId, sanitizedAnswer);

    return NextResponse.json({ success: true, data: question });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { success: false, error: error.errors[0].message },
        { status: 400 }
      );
    }
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}
