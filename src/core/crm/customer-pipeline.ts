import { Prisma } from "@prisma/client";
import { prisma } from "@core/infrastructure/prisma";
import { isCustomerStatus, type CustomerStatus } from "./customer-status";

let columnEnsured = false;

/** Self-heal: column exists on deployed DB even if migrate was skipped. */
export async function ensureCustomerPipelineColumn() {
  if (columnEnsured) return;
  await prisma.$executeRawUnsafe(
    `ALTER TABLE "customers" ADD COLUMN IF NOT EXISTS "pipelineStatus" TEXT NOT NULL DEFAULT 'NEW'`,
  );
  columnEnsured = true;
}

export async function setCustomerPipelineStatus(customerId: string, status: CustomerStatus) {
  await ensureCustomerPipelineColumn();
  await prisma.$executeRaw`
    UPDATE "customers"
    SET "pipelineStatus" = ${status}, "updatedAt" = CURRENT_TIMESTAMP
    WHERE "id" = ${customerId}
  `;
}

export async function getCustomerPipelineStatus(customerId: string): Promise<CustomerStatus> {
  await ensureCustomerPipelineColumn();
  const rows = await prisma.$queryRaw<{ pipelineStatus: string }[]>`
    SELECT "pipelineStatus" FROM "customers" WHERE "id" = ${customerId} LIMIT 1
  `;
  const raw = rows[0]?.pipelineStatus ?? "NEW";
  return isCustomerStatus(raw) ? raw : "NEW";
}

export async function getCustomerPipelineStatusMap(
  customerIds: string[],
): Promise<Map<string, CustomerStatus>> {
  const map = new Map<string, CustomerStatus>();
  if (customerIds.length === 0) return map;
  await ensureCustomerPipelineColumn();
  const rows = await prisma.$queryRaw<{ id: string; pipelineStatus: string }[]>`
    SELECT "id", "pipelineStatus" FROM "customers" WHERE "id" IN (${Prisma.join(customerIds)})
  `;
  for (const row of rows) {
    map.set(row.id, isCustomerStatus(row.pipelineStatus) ? row.pipelineStatus : "NEW");
  }
  return map;
}
