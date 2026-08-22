import { PrismaClient } from "@prisma/client";
import { PrismaPostgresAdapter } from "@prisma/adapter-ppg";
import {
  enterWorkshopContext,
  getWorkshopIdFromContext,
} from "@core/workshop/workshop-storage";
import { scopeQueryArgs, WORKSHOP_SCOPED_MODELS } from "@core/workshop/workshop-scope";

const globalForPrisma = globalThis as unknown as { prisma?: ReturnType<typeof createPrisma> };

/** Must stay in sync with workshop-context ALLOWED_WORKSHOP_IDS / WORKSHOP_COOKIE. */
const WORKSHOP_COOKIE = "active_workshop_id";
const ALLOWED_WORKSHOP_IDS = new Set(["ws_default_main", "ws_workshop_2"]);

async function resolveWorkshopIdForQuery(): Promise<string | undefined> {
  const fromAls = getWorkshopIdFromContext();
  if (fromAls) return fromAls;

  // Next.js can lose AsyncLocalStorage across RSC boundaries — fall back to cookie.
  try {
    const { cookies } = await import("next/headers");
    const value = (await cookies()).get(WORKSHOP_COOKIE)?.value?.trim();
    if (value && ALLOWED_WORKSHOP_IDS.has(value)) {
      enterWorkshopContext(value);
      return value;
    }
  } catch {
    // Outside a Next.js request (scripts, migrations).
  }
  return undefined;
}

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
      $allModels: {
        async $allOperations({ model, operation, args, query }) {
          if (model === "AuditLog" && AUDIT_MUTATIONS.has(operation)) {
            throw new Error("Журнал аудита неизменяем.");
          }
          const workshopId = WORKSHOP_SCOPED_MODELS.has(model)
            ? await resolveWorkshopIdForQuery()
            : getWorkshopIdFromContext();
          if (workshopId && WORKSHOP_SCOPED_MODELS.has(model)) {
            const scoped = scopeQueryArgs(model, operation, args as Record<string, unknown>, workshopId);
            const result = await query(scoped);
            // findUnique({ id }) cannot include workshopId in the unique selector —
            // reject rows that belong to another workshop.
            if (
              (operation === "findUnique" || operation === "findFirst") &&
              result &&
              typeof result === "object" &&
              "workshopId" in result &&
              (result as { workshopId?: string }).workshopId !== workshopId
            ) {
              return null;
            }
            return result;
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

/** Extended client or transaction callback argument — use instead of Prisma.TransactionClient. */
export type PrismaDb = typeof prisma;
export type PrismaTx = Parameters<Parameters<PrismaDb["$transaction"]>[0]>[0];

// Reuse one client per serverless instance (required on Vercel).
globalForPrisma.prisma = prisma;
