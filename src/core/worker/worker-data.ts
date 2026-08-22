import { prisma } from "@core/infrastructure/prisma";
import { D, moneyDisplay, qtyDisplay } from "@core/shared/decimal";
import { resolveOrderDateRange } from "@core/shared/order-period";
import { productLaborRate } from "@core/payroll/labor-rate";
import { getProductLaborRateMap, ensureProductLaborRateColumn } from "@core/payroll/product-labor-rate-db";
import { findFinishedGoodsWarehouse } from "@/core/config/resolve-warehouse";

export type WorkerPeriod = "today" | "week" | "month";

export type WorkerPeriodSnapshot = {
  producedDisplay: string;
  earnedDisplay: string;
  debtDisplay: string;
};

export type WorkerPeriodSnapshots = Record<WorkerPeriod, WorkerPeriodSnapshot>;

export type WorkerProductionLine = {
  productId: string;
  name: string;
  photoUrl: string | null;
  quantityDisplay: string;
  rateDisplay: string;
};

export type WorkerProductionByPeriod = Record<WorkerPeriod, WorkerProductionLine[]>;

function periodRanges() {
  return {
    today: resolveOrderDateRange({ period: "today" }),
    week: resolveOrderDateRange({ period: "week" }),
    month: resolveOrderDateRange({ period: "month" }),
  } as const;
}

function inRange(date: Date, from?: Date, to?: Date) {
  if (from && date < from) return false;
  if (to && date > to) return false;
  return true;
}

export async function fetchWorkerProducts() {
  await ensureProductLaborRateColumn();
  const fg = await findFinishedGoodsWarehouse();
  if (!fg) return [];

  const products = await prisma.product.findMany({
    where: { archivedAt: null, isActive: true },
    include: {
      saleUnit: true,
      stockItems: { where: { warehouseId: fg.id } },
    },
    orderBy: { name: "asc" },
  });

  return products.map((p) => ({
    id: p.id,
    name: p.name,
    unit: p.saleUnit.symbol,
    onHand: qtyDisplay(p.stockItems[0]?.qtyOnHand ?? 0),
    photoUrl: p.photoUrl,
  }));
}

export async function fetchWorkerPeriodSnapshots(userId: string): Promise<WorkerPeriodSnapshots> {
  const ranges = periodRanges();
  const from = ranges.month.from!;
  const to = ranges.month.to!;

  const [accruals, payouts] = await Promise.all([
    prisma.payrollAccrual.findMany({
      where: {
        userId,
        kind: "PRODUCTION",
        status: "ACCRUED",
        createdAt: { gte: from, lte: to },
      },
      select: { amount: true, quantity: true, createdAt: true },
    }),
    prisma.payrollPayout.findMany({
      where: { userId },
      select: { amount: true, createdAt: true },
    }),
  ]);

  const totalPaid = payouts.reduce((s, p) => s.add(String(p.amount)), D(0));
  const totalEarnedAll = accruals.reduce((s, a) => s.add(String(a.amount)), D(0));
  const debtAll = totalEarnedAll.sub(totalPaid);

  const out = {} as WorkerPeriodSnapshots;
  for (const period of ["today", "week", "month"] as const) {
    const range = ranges[period];
    const scoped = accruals.filter((a) => inRange(a.createdAt, range.from, range.to));
    const produced = scoped.reduce((s, a) => s.add(String(a.quantity ?? 0)), D(0));
    const earned = scoped.reduce((s, a) => s.add(String(a.amount)), D(0));
    out[period] = {
      producedDisplay: qtyDisplay(produced),
      earnedDisplay: moneyDisplay(earned),
      debtDisplay: moneyDisplay(debtAll.gt(0) ? debtAll : D(0)),
    };
  }

  return out;
}

function resolveProductFromComment(
  comment: string | null,
  products: { id: string; name: string; photoUrl: string | null }[],
) {
  if (!comment) return null;
  const byPrefix = products.find((p) => comment.startsWith(`${p.name}:`));
  if (byPrefix) return byPrefix;
  return products.find((p) => comment.includes(p.name)) ?? null;
}

export async function fetchWorkerProductionByPeriod(userId: string): Promise<WorkerProductionByPeriod> {
  const ranges = periodRanges();
  const from = ranges.month.from!;
  const to = ranges.month.to!;

  const [accruals, products] = await Promise.all([
    prisma.payrollAccrual.findMany({
      where: {
        userId,
        kind: "PRODUCTION",
        status: "ACCRUED",
        createdAt: { gte: from, lte: to },
      },
      select: {
        productId: true,
        quantity: true,
        createdAt: true,
        comment: true,
      },
      orderBy: { createdAt: "desc" },
    }),
    prisma.product.findMany({
      where: { archivedAt: null },
      select: { id: true, name: true, photoUrl: true },
    }),
  ]);

  const rateMap = await getProductLaborRateMap(products.map((p) => p.id));
  const productMap = new Map(products.map((p) => [p.id, p]));
  const out = {} as WorkerProductionByPeriod;

  for (const period of ["today", "week", "month"] as const) {
    const range = ranges[period];
    const scoped = accruals.filter((a) => inRange(a.createdAt, range.from, range.to));
    const grouped = new Map<
      string,
      { product: (typeof products)[number]; qty: ReturnType<typeof D> }
    >();

    for (const row of scoped) {
      const product =
        (row.productId ? productMap.get(row.productId) : null) ??
        resolveProductFromComment(row.comment, products);
      if (!product) continue;

      const prev = grouped.get(product.id);
      const addQty = D(String(row.quantity ?? 0));
      if (prev) {
        prev.qty = prev.qty.add(addQty);
      } else {
        grouped.set(product.id, { product, qty: addQty });
      }
    }

    out[period] = [...grouped.values()]
      .map(({ product, qty }) => ({
        productId: product.id,
        name: product.name,
        photoUrl: product.photoUrl,
        quantityDisplay: qtyDisplay(qty),
        rateDisplay: moneyDisplay(productLaborRate(rateMap.get(product.id))),
      }))
      .sort((a, b) => a.name.localeCompare(b.name, "ru"));
  }

  return out;
}

export async function fetchWorkerPayouts(userId: string, period: WorkerPeriod) {
  const range = periodRanges()[period];
  const payouts = await prisma.payrollPayout.findMany({
    where: {
      userId,
      createdAt: {
        gte: range.from,
        lte: range.to,
      },
    },
    orderBy: { createdAt: "desc" },
  });

  const accountIds = [...new Set(payouts.map((p) => p.accountId).filter(Boolean))] as string[];
  const accounts =
    accountIds.length > 0
      ? await prisma.cashAccount.findMany({ where: { id: { in: accountIds } } })
      : [];
  const accountMap = new Map(accounts.map((a) => [a.id, a.name]));

  return payouts.map((p) => ({
    id: p.id,
    amount: String(p.amount),
    comment: p.comment,
    createdAt: p.createdAt.toISOString(),
    accountLabel: p.accountId ? accountMap.get(p.accountId) ?? "" : "",
  }));
}
