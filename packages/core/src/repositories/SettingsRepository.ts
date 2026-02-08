import type { PrismaClient } from '@prisma/client';
import type { Settings } from '@claude-code-server/shared';

export class SettingsRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async get(key: string): Promise<Settings | null> {
    return this.prisma.settings.findUnique({
      where: { key },
    }) as Promise<Settings | null>;
  }

  async getAll(): Promise<Settings[]> {
    return this.prisma.settings.findMany() as Promise<Settings[]>;
  }

  async set(key: string, value: string): Promise<Settings> {
    return this.prisma.settings.upsert({
      where: { key },
      update: { value },
      create: { key, value },
    }) as Promise<Settings>;
  }

  async delete(key: string): Promise<void> {
    await this.prisma.settings.delete({ where: { key } }).catch(() => {
      // Ignore if setting doesn't exist
    });
  }
}
