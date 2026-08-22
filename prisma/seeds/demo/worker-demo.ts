import type { PrismaClient } from "@prisma/client";
import Decimal from "decimal.js";
import { periodKey } from "../../../src/core/payroll/payroll";
import { productLaborRate } from "../../../src/core/payroll/labor-rate";
import { getProductLaborRateMap, ensureProductLaborRateColumn } from "../../../src/core/payroll/product-labor-rate-db";
import { insertProductionAccrual } from "../../../src/core/payroll/payroll-accrual-db";

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
  const workers = await resolveWorkerUsers(prisma);
  if (workers.length === 0) {
    console.warn("[worker-demo] no worker user — skip (run db:seed:demo first)");
    return;
  }

  await backfillProductPhotos(prisma);
  await ensureProductLaborRateColumn();

  const products = await prisma.product.findMany({
    where: { archivedAt: null, isActive: true },
    orderBy: { name: "asc" },
    take: 8,
  });
  if (products.length === 0) {
    console.warn("[worker-demo] no products — skip accruals");
    return;
  }

  const rateMap = await getProductLaborRateMap(products.map((p) => p.id));

  const account = await prisma.cashAccount.findFirst({
    where: { isActive: true, archivedAt: null },
    orderBy: { code: "asc" },
  });

  for (const worker of workers) {
    await seedWorkerTabData(prisma, worker, products, rateMap, account?.id ?? null);
  }
}

async function resolveWorkerUsers(prisma: PrismaClient) {
  const preferred = await prisma.user.findUnique({ where: { email: "worker@workshop.local" } });
  if (preferred?.isActive) return [preferred];

  const workerRole = await prisma.role.findUnique({ where: { code: "worker" } });
  if (workerRole) {
    const byRole = await prisma.user.findMany({
      where: { roleId: workerRole.id, isActive: true },
      orderBy: { createdAt: "asc" },
    });
    if (byRole.length > 0) return byRole;
  }

  const productionPerm = await prisma.permission.findFirst({ where: { code: "production.view" } });
  if (!productionPerm) return [];

  const roleIds = (
    await prisma.rolePermission.findMany({
      where: { permissionId: productionPerm.id },
      select: { roleId: true },
    })
  ).map((row) => row.roleId);

  if (roleIds.length === 0) return [];

  const byRole = await prisma.user.findMany({
    where: {
      isActive: true,
      roleId: { in: roleIds },
      role: { code: { in: ["worker", "employee"] } },
    },
    orderBy: { createdAt: "asc" },
    take: 5,
  });
  if (byRole.length > 0) return byRole;

  return prisma.user.findMany({
    where: {
      isActive: true,
      role: { code: "employee" },
      permissions: { some: { permissionId: productionPerm.id } },
    },
    orderBy: { createdAt: "asc" },
    take: 5,
  });
}

async function seedWorkerTabData(
  prisma: PrismaClient,
  worker: { id: string; email: string | null },
  products: { id: string; name: string }[],
  rateMap: Map<string, string>,
  accountId: string | null,
) {

  await prisma.payrollAccrual.deleteMany({
    where: { userId: worker.id, comment: { startsWith: SEED_TAG } },
  });
  await prisma.payrollPayout.deleteMany({
    where: { userId: worker.id, comment: { startsWith: SEED_TAG } },
  });

  const accrualRows = [
    { daysAgo: 0, quantity: 14, productIdx: 0 },
    { daysAgo: 0, quantity: 8, productIdx: 1 },
    { daysAgo: 2, quantity: 32, productIdx: 2 },
    { daysAgo: 5, quantity: 18, productIdx: 3 },
    { daysAgo: 12, quantity: 55, productIdx: 0 },
    { daysAgo: 20, quantity: 40, productIdx: 1 },
  ] as const;

  for (const row of accrualRows) {
    const product = products[row.productIdx % products.length]!;
    const rate = productLaborRate(rateMap.get(product.id));
    const createdAt = atDaysAgo(row.daysAgo, 9 + (row.daysAgo % 4), 15);
    await prisma.$transaction(async (tx) => {
      await insertProductionAccrual(tx, {
        userId: worker.id,
        amount: money(row.quantity * Number(rate.toString())),
        quantity: qty(row.quantity),
        productId: product.id,
        periodKey: periodKey(createdAt),
        comment: `${SEED_TAG} · ${product.name}`,
        createdAt,
      });
    });
  }

  const payoutRows = [
    { daysAgo: 1, amount: 850, note: "Частичная выплата" },
    { daysAgo: 4, amount: 1200, note: "Аванс за неделю" },
    { daysAgo: 8, amount: 600, note: "Доплата" },
    { daysAgo: 14, amount: 950, note: "Выплата за декоративный камень" },
    { daysAgo: 18, amount: 2800, note: "Зарплата за прошлый период" },
    { daysAgo: 25, amount: 1500, note: "Аванс" },
  ] as const;

  for (const row of payoutRows) {
    const createdAt = atDaysAgo(row.daysAgo, 14, 0);
    await prisma.payrollPayout.create({
      data: {
        userId: worker.id,
        amount: money(row.amount),
        accountId,
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
