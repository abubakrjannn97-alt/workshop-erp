import { Prisma } from "@prisma/client";
import { prisma } from "@core/infrastructure/prisma";

let columnEnsured = false;

/** Self-heal: column exists even if migrate was skipped or Prisma client is stale. */
export async function ensureProductLaborRateColumn() {
  if (columnEnsured) return;
  await prisma.$executeRawUnsafe(
    `ALTER TABLE "products" ADD COLUMN IF NOT EXISTS "laborRate" DECIMAL(18,4) NOT NULL DEFAULT 0`,
  );
  columnEnsured = true;
}

export async function getProductLaborRate(productId: string): Promise<string | null> {
  await ensureProductLaborRateColumn();
  const rows = await prisma.$queryRaw<{ laborRate: string }[]>`
    SELECT "laborRate"::text AS "laborRate" FROM "products" WHERE "id" = ${productId} LIMIT 1
  `;
  return rows[0]?.laborRate ?? null;
}

export async function getProductLaborRateMap(productIds: string[]): Promise<Map<string, string>> {
  const map = new Map<string, string>();
  if (productIds.length === 0) return map;
  await ensureProductLaborRateColumn();
  const rows = await prisma.$queryRaw<{ id: string; laborRate: string }[]>`
    SELECT "id", "laborRate"::text AS "laborRate"
    FROM "products"
    WHERE "id" IN (${Prisma.join(productIds)})
  `;
  for (const row of rows) map.set(row.id, row.laborRate);
  return map;
}
