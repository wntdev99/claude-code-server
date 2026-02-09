// Re-export prisma client from core package
// This ensures singleton pattern is maintained

import { PrismaClient } from '@prisma/client';
import path from 'path';

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

function getDatabaseUrl(): string {
  const envUrl = process.env.DATABASE_URL;
  if (envUrl && envUrl.startsWith('file:')) {
    const filePath = envUrl.replace('file:', '');
    if (!path.isAbsolute(filePath)) {
      // Resolve relative to process.cwd() (package root in Next.js)
      const resolved = path.resolve(process.cwd(), filePath);
      return `file:${resolved}`;
    }
  }
  return envUrl || 'file:./dev.db';
}

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['warn', 'error'] : ['error'],
    datasources: {
      db: { url: getDatabaseUrl() },
    },
  });

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma;
}
