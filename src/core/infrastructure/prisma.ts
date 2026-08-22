import { PrismaClient } from "@prisma/client";
import { PrismaPostgresAdapter } from "@prisma/adapter-ppg";

const globalForPrisma = globalThis as unknown as { prisma?: ReturnType<typeof createPrisma> };

function isPrismaPostgresUrl(url: string) {
  return url.includes("db.prisma.io") || url.includes("pooled.db.prisma.io");
}

/** Direct TCP hostname for Prisma Postgres (used by the HTTP serverless driver). */
function prismaPostgresDirectUrl(url: string) {
  if (url.includes("@pooled.db.prisma.io")) {
    return url.replace("@pooled.db.prisma.io", "@db.prisma.io");
  }
  return url;
}

function databaseUrl() {
  let url = process.env.DATABASE_URL;
  if (!url) return url;
  if (url.includes("@db.prisma.io")) {
    url = url.replace("@db.prisma.io", "@pooled.db.prisma.io");
  }
  if (url.includes("connection_limit=")) return url;
  const poolSize = process.env.DB_POOL_SIZE || "5";
  const sep = url.includes("?") ? "&" : "?";
  return `${url}${sep}connection_limit=${poolSize}`;
}

const AUDIT_MUTATIONS = new Set(["update", "updateMany", "delete", "deleteMany"]);

function extendClient(client: PrismaClient) {
  return client.$extends({
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

function createPrisma() {
  const rawUrl = process.env.DATABASE_URL ?? "";
  const log = process.env.NODE_ENV === "development" ? (["error", "warn"] as const) : (["error"] as const);

  // Prisma Postgres on Vercel: TCP to *.prisma.io is blocked — use HTTP serverless driver.
  if (isPrismaPostgresUrl(rawUrl) || process.env.USE_PRISMA_PPG === "1") {
    const adapter = new PrismaPostgresAdapter({
      connectionString: prismaPostgresDirectUrl(rawUrl),
    });
    return extendClient(
      new PrismaClient({
        log: [...log],
        adapter,
      }),
    );
  }

  return extendClient(
    new PrismaClient({
      log: [...log],
      datasources: databaseUrl() ? { db: { url: databaseUrl()! } } : undefined,
      transactionOptions: {
        maxWait: 15_000,
        timeout: 30_000,
      },
    }),
  );
}

export const prisma = globalForPrisma.prisma ?? createPrisma();

// Reuse one client per serverless instance (required on Vercel).
globalForPrisma.prisma = prisma;
