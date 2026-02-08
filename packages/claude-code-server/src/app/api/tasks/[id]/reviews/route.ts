import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

type RouteContext = { params: Promise<{ id: string }> };

// GET /api/tasks/:id/reviews
export async function GET(_req: NextRequest, context: RouteContext) {
  const { id } = await context.params;

  const reviews = await prisma.review.findMany({
    where: { taskId: id },
    orderBy: { createdAt: 'desc' },
  });

  return NextResponse.json({ success: true, data: reviews });
}
