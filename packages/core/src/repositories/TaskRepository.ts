import type { PrismaClient } from '@prisma/client';
import type {
  Task,
  CreateTaskInput,
  UpdateTaskInput,
  TaskStatus,
  TaskType,
} from '@claude-code-server/shared';

export class TaskRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async findById(id: string): Promise<Task | null> {
    return this.prisma.task.findUnique({
      where: { id },
    }) as Promise<Task | null>;
  }

  async findAll(options?: {
    status?: TaskStatus;
    type?: TaskType;
    page?: number;
    pageSize?: number;
  }): Promise<{ tasks: Task[]; total: number }> {
    const page = options?.page ?? 1;
    const pageSize = options?.pageSize ?? 20;
    const where: Record<string, string> = {};

    if (options?.status) where.status = options.status;
    if (options?.type) where.type = options.type;

    const [tasks, total] = await Promise.all([
      this.prisma.task.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      this.prisma.task.count({ where }),
    ]);

    return { tasks: tasks as Task[], total };
  }

  async create(input: CreateTaskInput & { workspace: string }): Promise<Task> {
    return this.prisma.task.create({
      data: {
        title: input.title,
        type: input.type,
        description: input.description,
        status: 'draft',
        workspace: input.workspace,
      },
    }) as Promise<Task>;
  }

  async update(id: string, input: UpdateTaskInput): Promise<Task> {
    return this.prisma.task.update({
      where: { id },
      data: input,
    }) as Promise<Task>;
  }

  async updatePhase(
    id: string,
    phase: number,
    progress: number
  ): Promise<Task> {
    return this.prisma.task.update({
      where: { id },
      data: { currentPhase: phase, progress },
    }) as Promise<Task>;
  }

  async updateStatus(id: string, status: TaskStatus): Promise<Task> {
    return this.prisma.task.update({
      where: { id },
      data: { status },
    }) as Promise<Task>;
  }

  async delete(id: string): Promise<void> {
    await this.prisma.task.delete({ where: { id } });
  }
}
