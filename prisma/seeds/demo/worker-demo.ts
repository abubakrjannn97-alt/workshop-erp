import type { PrismaClient } from "@prisma/client";
import Decimal from "decimal.js";
import { periodKey } from "../../../src/core/payroll/payroll";
import { DEFAULT_PRODUCT_LABOR_RATE } from "../../../src/core/payroll/labor-rate";

const SEED_TAG = "seed-worker-demo";
const D = (v: string | number) => new Decimal(v);
const money = (v: number) => D(v).toFixed(2);
const qty = (v: number) => D(v).toFixed(6);

function atDaysAgo(n: number, hour = 10, minute = 30) {
  const d = new Date();
  d.setDate(d.getDate() - n);
  d.setHours(hour, minute, 0, 0);
  return d;
}

/** Demo accruals + payouts for worker mobile tabs (stats, salary). Idempotent. */
export async function seedWorkerTabDemo(prisma: PrismaClient) {
  let worker = await prisma.user.findUnique({ where: { email: "worker@workshop.local" } });
  if (!worker) {
    const workerRole = await prisma.role.findUnique({ where: { code: "worker" } });
    if (workerRole) {
      worker = await prisma.user.findFirst({
        where: { roleId: workerRole.id, isActive: true },
        orderBy: { createdAt: "asc" },
      });
    }
  }
  if (!worker) {
    console.warn("[worker-demo] no worker user — skip (run db:seed:demo first)");
    return;
  }

  await backfillProductPhotos(prisma);

  await prisma.payrollAccrual.deleteMany({
    where: { userId: worker.id, comment: { startsWith: SEED_TAG } },
  });
  await prisma.payrollPayout.deleteMany({
    where: { userId: worker.id, comment: { startsWith: SEED_TAG } },
  });

  const rate = Number(DEFAULT_PRODUCT_LABOR_RATE);
  const accrualRows = [
    { daysAgo: 0, quantity: 14, scrap: 1, label: "Сегодня · плитка серая" },
    { daysAgo: 0, quantity: 8, scrap: 0, label: "Сегодня · камень «Скала»" },
    { daysAgo: 2, quantity: 32, scrap: 2, label: "На этой неделе · кирпич" },
    { daysAgo: 5, quantity: 18, scrap: 0, label: "На этой неделе · цоколь" },
    { daysAgo: 12, quantity: 55, scrap: 3, label: "В этом месяце · травертин" },
    { daysAgo: 20, quantity: 40, scrap: 1, label: "В этом месяце · плитка" },
  ] as const;

  for (const row of accrualRows) {
    const createdAt = atDaysAgo(row.daysAgo, 9 + (row.daysAgo % 4), 15);
    const scrapNote = row.scrap > 0 ? `, брак ${row.scrap} м²` : "";
    await prisma.payrollAccrual.create({
      data: {
        userId: worker.id,
        kind: "PRODUCTION",
        amount: money(row.quantity * rate),
        quantity: qty(row.quantity),
        periodKey: periodKey(createdAt),
        status: "ACCRUED",
        comment: `${SEED_TAG} · ${row.label}${scrapNote}`,
        createdAt,
      },
    });
  }

  const account = await prisma.cashAccount.findFirst({
    where: { isActive: true, archivedAt: null },
    orderBy: { code: "asc" },
  });

  const payoutRows = [
    { daysAgo: 4, amount: 1200, note: "Аванс за неделю" },
    { daysAgo: 18, amount: 2800, note: "Зарплата за прошлый период" },
  ] as const;

  for (const row of payoutRows) {
    const createdAt = atDaysAgo(row.daysAgo, 14, 0);
    await prisma.payrollPayout.create({
      data: {
        userId: worker.id,
        amount: money(row.amount),
        accountId: account?.id ?? null,
        periodKey: periodKey(createdAt),
        comment: `${SEED_TAG} · ${row.note}`,
        createdAt,
      },
    });
  }

  console.log(
    `[worker-demo] ${accrualRows.length} accruals + ${payoutRows.length} payouts for ${worker.email ?? worker.id}`,
  );
}

async function backfillProductPhotos(prisma: PrismaClient) {
  try {
    const { FACADE_PRODUCTS } = await import("../../../src/domains/facade/catalog");
    for (const def of FACADE_PRODUCTS) {
      if (!def.photoUrl) continue;
      await prisma.product.updateMany({
        where: { name: def.name, photoUrl: null, archivedAt: null },
        data: { photoUrl: def.photoUrl },
      });
    }
  } catch {
    /* domain catalog optional */
  }
}
