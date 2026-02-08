import type { PrismaClient } from '@prisma/client';
import type { Log } from '@claude-code-server/shared';

export class LogRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async findByTaskId(
    taskId: string,
    options?: { limit?: number; offset?: number }
  ): Promise<Log[]> {
    return this.prisma.log.findMany({
      where: { taskId },
      orderBy: { createdAt: 'asc' },
      skip: options?.offset,
      take: options?.limit,
    }) as Promise<Log[]>;
  }

  async create(data: {
    taskId: string;
    level: string;
    message: string;
    metadata?: string;
  }): Promise<Log> {
    return this.prisma.log.create({
      data: {
        taskId: data.taskId,
        level: data.level,
        message: data.message,
        metadata: data.metadata ?? null,
      },
    }) as Promise<Log>;
  }

  async deleteByTaskId(taskId: string): Promise<void> {
    await this.prisma.log.deleteMany({ where: { taskId } });
  }
}
