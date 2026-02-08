import type { PrismaClient } from '@prisma/client';
import type { Review, ReviewStatus } from '@claude-code-server/shared';

export class ReviewRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async findById(id: string): Promise<Review | null> {
    return this.prisma.review.findUnique({
      where: { id },
    }) as Promise<Review | null>;
  }

  async findByTaskId(taskId: string): Promise<Review[]> {
    return this.prisma.review.findMany({
      where: { taskId },
      orderBy: { createdAt: 'desc' },
    }) as Promise<Review[]>;
  }

  async create(data: {
    taskId: string;
    phase: number;
    deliverables: string;
  }): Promise<Review> {
    return this.prisma.review.create({
      data: {
        taskId: data.taskId,
        phase: data.phase,
        status: 'pending',
        deliverables: data.deliverables,
      },
    }) as Promise<Review>;
  }

  async updateStatus(
    id: string,
    status: ReviewStatus,
    feedback?: string
  ): Promise<Review> {
    return this.prisma.review.update({
      where: { id },
      data: { status, feedback },
    }) as Promise<Review>;
  }
}
