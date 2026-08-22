import { prisma } from "@core/infrastructure/prisma";
import { D, moneyDisplay, qtyDisplay } from "@core/shared/decimal";
import { materialCostForRecipe, scaleNeed } from "@core/costing/costing";
import { productLaborRate } from "@core/payroll/labor-rate";
import { ORDER_STATUS } from "@core/orders/orders";
import { resolveOrderDateRange, type OrderPeriod } from "@core/shared/order-period";

export type HomeProfitPeriod = Extract<OrderPeriod, "today" | "week" | "month">;

export type OwnerProfitPeriodKpi = {
  profit: ReturnType<typeof D>;
  sales: ReturnType<typeof D>;
  orderCount: number;
};

export type OwnerProfitKpis = Record<HomeProfitPeriod, OwnerProfitPeriodKpi>;

export type OwnerProfitKpisClient = Record<
  HomeProfitPeriod,
  { profitDisplay: string; profitNegative: boolean; orderCount: number }
>;

export function serializeOwnerProfitKpis(data: OwnerProfitKpis): OwnerProfitKpisClient {
  const out = {} as OwnerProfitKpisClient;
  for (const period of ["today", "week", "month"] as const) {
    const row = data[period];
    out[period] = {
      profitDisplay: moneyDisplay(row.profit),
      profitNegative: row.profit.lt(0),
      orderCount: row.orderCount,
    };
  }
  return out;
}

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
  scrapToday: ReturnType<typeof D>;
  producedToday: ReturnType<typeof D>;
  producedChangePct: number | null;
};

export async function fetchOwnerOperationalKpis(): Promise<OwnerOperationalKpis> {
  const todayStart = startOfDay();
  const todayEnd = endOfDay();
  const yesterdayStart = startOfDay(new Date(Date.now() - 86_400_000));
  const yesterdayEnd = endOfDay(new Date(Date.now() - 86_400_000));

  const [todayOrders, scrapToday, producedToday, producedYesterday] = await Promise.all([
    prisma.order.findMany({
      where: {
        createdAt: { gte: todayStart, lte: todayEnd },
        status: { code: { not: ORDER_STATUS.CANCELLED } },
      },
      select: { total: true },
    }),
    prisma.scrapRecord.aggregate({
      where: { createdAt: { gte: todayStart, lte: todayEnd } },
      _sum: { quantity: true },
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
  const todayQty = D(String(producedToday._sum.actualQty ?? 0));
  const yesterdayQty = D(String(producedYesterday._sum.actualQty ?? 0));

  return {
    salesToday,
    salesTodayCount: todayOrders.length,
    scrapToday: D(String(scrapToday._sum.quantity ?? 0)),
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

async function loadProductCostMaps(productIds: string[]) {
  const matPerUnit = new Map<string, ReturnType<typeof D>>();
  const laborPerUnit = new Map<string, ReturnType<typeof D>>();
  if (productIds.length === 0) return { matPerUnit, laborPerUnit };

  const products = await prisma.product.findMany({
    where: { id: { in: productIds } },
    include: {
      recipe: {
        include: {
          versions: {
            where: { validTo: null },
            include: {
              items: { include: { material: { include: { storageUnit: true } }, unit: true } },
            },
            take: 1,
          },
        },
      },
    },
  });

  for (const p of products) {
    const version = p.recipe?.versions[0];
    if (!version) {
      matPerUnit.set(p.id, D(0));
    } else {
      const scale = scaleNeed(p.recipeBaseQty, 1);
      const cost = materialCostForRecipe(version.items, Number(scale.toString()));
      matPerUnit.set(p.id, cost.total ? D(cost.total) : D(0));
    }
    laborPerUnit.set(p.id, productLaborRate());
  }

  return { matPerUnit, laborPerUnit };
}

async function profitForPeriod(period: HomeProfitPeriod): Promise<OwnerProfitPeriodKpi> {
  const { from, to } = resolveOrderDateRange({ period });
  const orders = await prisma.order.findMany({
    where: {
      ...(from || to
        ? {
            createdAt: {
              ...(from ? { gte: from } : {}),
              ...(to ? { lte: to } : {}),
            },
          }
        : {}),
      status: { code: { not: ORDER_STATUS.CANCELLED } },
    },
    select: {
      total: true,
      items: { select: { productId: true, quantity: true } },
    },
  });

  const productIds = [...new Set(orders.flatMap((o) => o.items.map((i) => i.productId)))];
  const { matPerUnit, laborPerUnit } = await loadProductCostMaps(productIds);

  let sales = D(0);
  let cost = D(0);
  for (const order of orders) {
    sales = sales.plus(D(String(order.total)));
    for (const item of order.items) {
      const qty = D(String(item.quantity));
      const mat = matPerUnit.get(item.productId) ?? D(0);
      const labor = laborPerUnit.get(item.productId) ?? D(0);
      cost = cost.plus(qty.mul(mat)).plus(qty.mul(labor));
    }
  }

  return {
    profit: sales.minus(cost),
    sales,
    orderCount: orders.length,
  };
}

function summarizeOrders(
  orders: {
    total: unknown;
    createdAt: Date;
    items: { productId: string; quantity: unknown }[];
  }[],
  from: Date | undefined,
  to: Date | undefined,
  matPerUnit: Map<string, ReturnType<typeof D>>,
  laborPerUnit: Map<string, ReturnType<typeof D>>,
): OwnerProfitPeriodKpi {
  let sales = D(0);
  let cost = D(0);
  let orderCount = 0;
  for (const order of orders) {
    if (from && order.createdAt < from) continue;
    if (to && order.createdAt > to) continue;
    orderCount += 1;
    sales = sales.plus(D(String(order.total)));
    for (const item of order.items) {
      const qty = D(String(item.quantity));
      const mat = matPerUnit.get(item.productId) ?? D(0);
      const labor = laborPerUnit.get(item.productId) ?? D(0);
      cost = cost.plus(qty.mul(mat)).plus(qty.mul(labor));
    }
  }
  return { profit: sales.minus(cost), sales, orderCount };
}

export async function fetchOwnerProfitKpis(): Promise<OwnerProfitKpis> {
  const todayRange = resolveOrderDateRange({ period: "today" });
  const weekRange = resolveOrderDateRange({ period: "week" });
  const monthRange = resolveOrderDateRange({ period: "month" });

  const fromCandidates = [todayRange.from, weekRange.from, monthRange.from].filter(Boolean) as Date[];
  const from = fromCandidates.reduce((min, d) => (d < min ? d : min));
  const to = todayRange.to ?? endOfDay();

  const orders = await prisma.order.findMany({
    where: {
      createdAt: { gte: from, lte: to },
      status: { code: { not: ORDER_STATUS.CANCELLED } },
    },
    select: {
      total: true,
      createdAt: true,
      items: { select: { productId: true, quantity: true } },
    },
  });

  const productIds = [...new Set(orders.flatMap((o) => o.items.map((i) => i.productId)))];
  const { matPerUnit, laborPerUnit } = await loadProductCostMaps(productIds);

  return {
    today: summarizeOrders(orders, todayRange.from, todayRange.to, matPerUnit, laborPerUnit),
    week: summarizeOrders(orders, weekRange.from, weekRange.to, matPerUnit, laborPerUnit),
    month: summarizeOrders(orders, monthRange.from, monthRange.to, matPerUnit, laborPerUnit),
  };
}
