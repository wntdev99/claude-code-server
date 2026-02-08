import type { PrismaClient } from '@prisma/client';
import type { Question } from '@claude-code-server/shared';

export class QuestionRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async findById(id: string): Promise<Question | null> {
    return this.prisma.question.findUnique({
      where: { id },
    }) as Promise<Question | null>;
  }

  async findByTaskId(taskId: string): Promise<Question[]> {
    return this.prisma.question.findMany({
      where: { taskId },
      orderBy: { createdAt: 'desc' },
    }) as Promise<Question[]>;
  }

  async findUnanswered(taskId: string): Promise<Question[]> {
    return this.prisma.question.findMany({
      where: { taskId, answer: null },
      orderBy: { createdAt: 'asc' },
    }) as Promise<Question[]>;
  }

  async create(data: {
    taskId: string;
    category: string;
    question: string;
    options: string;
  }): Promise<Question> {
    return this.prisma.question.create({
      data: {
        taskId: data.taskId,
        category: data.category,
        question: data.question,
        options: data.options,
      },
    }) as Promise<Question>;
  }

  async answer(id: string, answer: string): Promise<Question> {
    return this.prisma.question.update({
      where: { id },
      data: { answer, answeredAt: new Date() },
    }) as Promise<Question>;
  }
}
