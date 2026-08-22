import { prisma } from "@core/infrastructure/prisma";
import { D, moneyDisplay, qtyDisplay } from "@core/shared/decimal";
import { resolveOrderDateRange } from "@core/shared/order-period";
import { findFinishedGoodsWarehouse } from "@/core/config/resolve-warehouse";

export type WorkerPeriod = "today" | "week" | "month";

export type WorkerPeriodSnapshot = {
  producedDisplay: string;
  earnedDisplay: string;
  debtDisplay: string;
};

export type WorkerPeriodSnapshots = Record<WorkerPeriod, WorkerPeriodSnapshot>;

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
    include: { account: true },
    orderBy: { createdAt: "desc" },
  });

  return payouts.map((p) => ({
    id: p.id,
    amount: String(p.amount),
    comment: p.comment,
    createdAt: p.createdAt.toISOString(),
    accountLabel: p.account?.name ?? "",
  }));
}
