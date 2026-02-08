import type { PrismaClient } from '@prisma/client';
import type { Checkpoint } from '@claude-code-server/shared';

export class CheckpointRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async findById(id: string): Promise<Checkpoint | null> {
    return this.prisma.checkpoint.findUnique({
      where: { id },
    }) as Promise<Checkpoint | null>;
  }

  async findByTaskId(taskId: string): Promise<Checkpoint[]> {
    return this.prisma.checkpoint.findMany({
      where: { taskId },
      orderBy: { createdAt: 'desc' },
    }) as Promise<Checkpoint[]>;
  }

  async findLatest(taskId: string): Promise<Checkpoint | null> {
    return this.prisma.checkpoint.findFirst({
      where: { taskId },
      orderBy: { createdAt: 'desc' },
    }) as Promise<Checkpoint | null>;
  }

  async create(data: {
    taskId: string;
    reason: string;
    state: string;
  }): Promise<Checkpoint> {
    return this.prisma.checkpoint.create({
      data: {
        taskId: data.taskId,
        reason: data.reason,
        state: data.state,
      },
    }) as Promise<Checkpoint>;
  }
}
