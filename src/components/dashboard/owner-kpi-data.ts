import { prisma } from "@core/infrastructure/prisma";
import { D, moneyDisplay, qtyDisplay } from "@core/shared/decimal";
import { findFinishedGoodsWarehouse } from "@core/config/resolve-warehouse";
import { ORDER_STATUS } from "@core/orders/orders";

function startOfDay(d = new Date()) {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

function endOfDay(d = new Date()) {
  const x = new Date(d);
  x.setHours(23, 59, 59, 999);
  return x;
}

function pctChange(today: ReturnType<typeof D>, yesterday: ReturnType<typeof D>) {
  if (yesterday.lte(0)) {
    if (today.lte(0)) return null;
    return 100;
  }
  return today.sub(yesterday).div(yesterday).mul(100).toDecimalPlaces(0).toNumber();
}

export type OwnerOperationalKpis = {
  salesToday: ReturnType<typeof D>;
  salesTodayCount: number;
  fgTotal: ReturnType<typeof D>;
  producedToday: ReturnType<typeof D>;
  producedChangePct: number | null;
};

export async function fetchOwnerOperationalKpis(): Promise<OwnerOperationalKpis> {
  const todayStart = startOfDay();
  const todayEnd = endOfDay();
  const yesterdayStart = startOfDay(new Date(Date.now() - 86_400_000));
  const yesterdayEnd = endOfDay(new Date(Date.now() - 86_400_000));

  const [todayOrders, fgStock, producedToday, producedYesterday] = await Promise.all([
    prisma.order.findMany({
      where: {
        createdAt: { gte: todayStart, lte: todayEnd },
        status: { code: { not: ORDER_STATUS.CANCELLED } },
      },
      select: { total: true },
    }),
    findFinishedGoodsWarehouse().then(async (wh) => {
      if (!wh) return [];
      return prisma.stockItem.findMany({
        where: { warehouseId: wh.id, productId: { not: null }, materialId: null },
      });
    }),
    prisma.productionBatch.aggregate({
      where: { status: "CLOSED", producedAt: { gte: todayStart, lte: todayEnd } },
      _sum: { actualQty: true },
    }),
    prisma.productionBatch.aggregate({
      where: { status: "CLOSED", producedAt: { gte: yesterdayStart, lte: yesterdayEnd } },
      _sum: { actualQty: true },
    }),
  ]);

  const salesToday = todayOrders.reduce((s, o) => s.add(String(o.total)), D(0));
  const fgTotal = fgStock.reduce((s, row) => s.add(String(row.qtyOnHand)), D(0));
  const todayQty = D(String(producedToday._sum.actualQty ?? 0));
  const yesterdayQty = D(String(producedYesterday._sum.actualQty ?? 0));

  return {
    salesToday,
    salesTodayCount: todayOrders.length,
    fgTotal,
    producedToday: todayQty,
    producedChangePct: pctChange(todayQty, yesterdayQty),
  };
}

export function formatFgQty(qty: ReturnType<typeof D>) {
  return qtyDisplay(qty);
}

export function formatSalesMoney(qty: ReturnType<typeof D>) {
  return moneyDisplay(qty);
}
