import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export type DatabaseStatus =
  | { available: true; client: PrismaClient }
  | { available: false; reason: 'no_database_url' | 'client_not_generated' | 'connection_error'; message: string };

let _initError: DatabaseStatus | null = null;

function createPrismaClient(): PrismaClient | null {
  if (!process.env.DATABASE_URL) {
    _initError = { available: false, reason: 'no_database_url', message: 'DATABASE_URL environment variable is not set' };
    return null;
  }

  try {
    const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
    return new PrismaClient({ adapter });
  } catch (error: unknown) {
    const err = error instanceof Error ? error : new Error(String(error));

    let reason: 'client_not_generated' | 'connection_error' = 'connection_error';
    if (
      err.message.includes('prisma generate') ||
      err.message.includes('not been generated') ||
      err.name === 'PrismaClientInitializationError'
    ) {
      reason = 'client_not_generated';
    }

    console.error(`[ARGUS DB] Prisma init failed: ${err.name}: ${err.message}`);
    if (err.stack) console.error(`[ARGUS DB] Stack: ${err.stack}`);

    _initError = { available: false, reason, message: err.message };
    return null;
  }
}

export const prisma = globalForPrisma.prisma ?? createPrismaClient();

if (process.env.NODE_ENV !== 'production' && prisma) {
  globalForPrisma.prisma = prisma;
}

export function isDatabaseConfigured(): boolean {
  return !!process.env.DATABASE_URL;
}

export function getDatabaseStatus(): DatabaseStatus {
  if (prisma) return { available: true, client: prisma };
  if (_initError) return _initError;
  return { available: false, reason: 'no_database_url', message: 'DATABASE_URL environment variable is not set' };
}
