import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

function databaseUrl() {
  const url = process.env.DATABASE_URL;
  if (!url || url.includes("connection_limit=")) return url;
  const sep = url.includes("?") ? "&" : "?";
  return `${url}${sep}connection_limit=1`;
}

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"],
    datasources: databaseUrl() ? { db: { url: databaseUrl()! } } : undefined,
    transactionOptions: {
      maxWait: 15_000,
      timeout: 30_000,
    },
  });

// Reuse one client per serverless instance (required on Vercel).
globalForPrisma.prisma = prisma;
