import { randomUUID } from "crypto";
import type { Prisma } from "@prisma/client";
import { prisma } from "@core/infrastructure/prisma";

let columnEnsured = false;

export type ProductionAccrualRow = {
  productId: string | null;
  quantity: string | null;
  createdAt: Date;
  comment: string | null;
};

/** Self-heal: column exists even if migrate was skipped or Prisma client is stale. */
export async function ensurePayrollAccrualProductIdColumn() {
  if (columnEnsured) return;
  await prisma.$executeRawUnsafe(
    `ALTER TABLE "payroll_accruals" ADD COLUMN IF NOT EXISTS "productId" TEXT`,
  );
  columnEnsured = true;
}

export async function fetchProductionAccruals(
  userId: string,
  from: Date,
  to: Date,
): Promise<ProductionAccrualRow[]> {
  await ensurePayrollAccrualProductIdColumn();
  return prisma.$queryRaw<ProductionAccrualRow[]>`
    SELECT
      "productId",
      "quantity"::text AS quantity,
      "createdAt",
      "comment"
    FROM "payroll_accruals"
    WHERE "userId" = ${userId}
      AND kind = 'PRODUCTION'
      AND status = 'ACCRUED'
      AND "createdAt" >= ${from}
      AND "createdAt" <= ${to}
    ORDER BY "createdAt" DESC
  `;
}

export async function insertProductionAccrual(
  tx: Prisma.TransactionClient,
  data: {
    userId: string;
    amount: string;
    quantity: string;
    productId: string;
    periodKey: string;
    comment: string;
    createdAt?: Date;
  },
) {
  await ensurePayrollAccrualProductIdColumn();
  const id = randomUUID();
  const createdAt = data.createdAt ?? new Date();
  await tx.$executeRaw`
    INSERT INTO "payroll_accruals" (
      id, "userId", kind, amount, quantity, "productId", "periodKey", status, "comment", "createdAt"
    ) VALUES (
      ${id},
      ${data.userId},
      'PRODUCTION',
      ${data.amount}::decimal,
      ${data.quantity}::decimal,
      ${data.productId},
      ${data.periodKey},
      'ACCRUED',
      ${data.comment},
      ${createdAt}
    )
  `;
}
