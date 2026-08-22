import { prisma } from "@core/infrastructure/prisma";
import type { CustomerStatus } from "./customer-status";

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
