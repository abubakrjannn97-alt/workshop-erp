import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as { prisma?: ReturnType<typeof createPrisma> };

function databaseUrl() {
  const url = process.env.DATABASE_URL;
  if (!url || url.includes("connection_limit=")) return url;
  const poolSize = process.env.DB_POOL_SIZE || "5";
  const sep = url.includes("?") ? "&" : "?";
  return `${url}${sep}connection_limit=${poolSize}`;
}

const AUDIT_MUTATIONS = new Set(["update", "updateMany", "delete", "deleteMany"]);

function createPrisma() {
  return new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"],
    datasources: databaseUrl() ? { db: { url: databaseUrl()! } } : undefined,
    transactionOptions: {
      maxWait: 15_000,
      timeout: 30_000,
    },
  }).$extends({
    query: {
      auditLog: {
        async $allOperations({ operation, args, query }) {
          if (AUDIT_MUTATIONS.has(operation)) {
            throw new Error("Журнал аудита неизменяем.");
          }
          return query(args);
        },
      },
    },
  });
}

export const prisma = globalForPrisma.prisma ?? createPrisma();

// Reuse one client per serverless instance (required on Vercel).
globalForPrisma.prisma = prisma;
