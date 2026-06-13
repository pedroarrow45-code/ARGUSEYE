import { PrismaClient } from '@prisma/client';

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

function createPrismaClient(): PrismaClient | null {
  if (!process.env.DATABASE_URL) return null;

  try {
    return new PrismaClient({});
  } catch (error) {
    console.error(
      'Prisma Client não pôde ser inicializado. Verifique se `prisma generate` foi executado no deploy e se o runtime Prisma está configurado.',
      error instanceof Error ? { name: error.name, message: error.message } : { error },
    );
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
