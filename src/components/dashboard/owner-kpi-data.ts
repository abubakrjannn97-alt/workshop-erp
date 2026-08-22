import { prisma } from "@core/infrastructure/prisma";
import { D, moneyDisplay, qtyDisplay } from "@core/shared/decimal";
import { materialCostForRecipe, scaleNeed } from "@core/costing/costing";
import { productLaborRate } from "@core/payroll/labor-rate";
import { ORDER_STATUS } from "@core/orders/orders";
import { resolveOrderDateRange, type OrderPeriod } from "@core/shared/order-period";
import { runWithWorkshop } from "@core/workshop/workshop-storage";

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

export async function fetchOwnerProfitKpis(workshopId?: string): Promise<OwnerProfitKpis> {
  const todayRange = resolveOrderDateRange({ period: "today" });
  const weekRange = resolveOrderDateRange({ period: "week" });
  const monthRange = resolveOrderDateRange({ period: "month" });

  const fromCandidates = [todayRange.from, weekRange.from, monthRange.from].filter(Boolean) as Date[];
  const from = fromCandidates.reduce((min, d) => (d < min ? d : min));
  const to = todayRange.to ?? endOfDay();

  const orders = await prisma.order.findMany({
    where: {
      ...(workshopId ? { workshopId } : {}),
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

export type SerializedRecentOrder = {
  id: string;
  customerName: string;
  totalDisplay: string;
  statusLabel: string;
  statusCode: string;
  productSummary: string;
  photos: { url?: string; letter: string }[];
};

export type OwnerPeriodMetricSnapshot = {
  profitDisplay: string;
  profitNegative: boolean;
  scrapValue: string;
  scrapHint: string;
  scrapHintTone: "positive" | "negative" | "neutral";
  hasScrap: boolean;
  producedValue: string;
  producedHint: string;
  producedHintTone: "positive" | "negative" | "neutral";
  recentOrders: SerializedRecentOrder[];
};

export type OwnerDashboardSnapshots = Record<HomeProfitPeriod, OwnerPeriodMetricSnapshot>;

type RecentOrderRow = {
  id: string;
  total: unknown;
  createdAt: Date;
  customer: { name: string };
  status: { code: string; name: string };
  items: { product: { name: string; photoUrl: string | null } }[];
};

function inRange(date: Date, from: Date | undefined, to: Date | undefined) {
  if (from && date < from) return false;
  if (to && date > to) return false;
  return true;
}

function serializeRecentOrder(
  order: RecentOrderRow,
  n: (group: string, code: string, fallback: string) => string,
): SerializedRecentOrder {
  const items = order.items ?? [];
  const first = items[0]?.product.name ?? "—";
  const productSummary = items.length <= 1 ? first : `${first} +${items.length - 1}`;
  const photos =
    items.length === 0
      ? [{ letter: "?" }]
      : items.slice(0, 3).map((item) => ({
          url: item.product.photoUrl ?? undefined,
          letter: item.product.name.slice(0, 1),
        }));

  return {
    id: order.id,
    customerName: order.customer.name,
    totalDisplay: moneyDisplay(String(order.total)),
    statusLabel: n("ostatus", order.status.code, order.status.name),
    statusCode: order.status.code,
    productSummary,
    photos,
  };
}

function sumScrapInRange(
  rows: { createdAt: Date; quantity: unknown }[],
  from: Date | undefined,
  to: Date | undefined,
) {
  return rows.reduce((sum, row) => {
    if (!inRange(row.createdAt, from, to)) return sum;
    return sum.plus(D(String(row.quantity)));
  }, D(0));
}

function sumProducedInRange(
  rows: { producedAt: Date | null; actualQty: unknown }[],
  from: Date | undefined,
  to: Date | undefined,
) {
  return rows.reduce((sum, row) => {
    if (!row.producedAt || !inRange(row.producedAt, from, to)) return sum;
    return sum.plus(D(String(row.actualQty)));
  }, D(0));
}

export async function fetchOwnerDashboardSnapshots(
  t: (key: string) => string,
  n: (group: string, code: string, fallback: string) => string,
  workshopId: string,
): Promise<OwnerDashboardSnapshots> {
  return runWithWorkshop(workshopId, async () => {
  const todayRange = resolveOrderDateRange({ period: "today" });
  const weekRange = resolveOrderDateRange({ period: "week" });
  const monthRange = resolveOrderDateRange({ period: "month" });
  const ranges = { today: todayRange, week: weekRange, month: monthRange };

  const fromCandidates = [todayRange.from, weekRange.from, monthRange.from].filter(Boolean) as Date[];
  const from = fromCandidates.reduce((min, d) => (d < min ? d : min));
  const to = todayRange.to ?? endOfDay();

  const yesterdayStart = startOfDay(new Date(Date.now() - 86_400_000));
  const yesterdayEnd = endOfDay(new Date(Date.now() - 86_400_000));

  const [profitKpis, scrapRows, batchRows, recentOrderRows] = await Promise.all([
    fetchOwnerProfitKpis(workshopId),
    prisma.scrapRecord.findMany({
      where: { workshopId, createdAt: { gte: from, lte: to } },
      select: { createdAt: true, quantity: true },
    }),
    prisma.productionBatch.findMany({
      where: { workshopId, status: "CLOSED", producedAt: { gte: from, lte: to } },
      select: { producedAt: true, actualQty: true },
    }),
    prisma.order.findMany({
      where: {
        workshopId,
        createdAt: { gte: from, lte: to },
        status: { code: { not: ORDER_STATUS.CANCELLED } },
      },
      include: {
        customer: true,
        status: true,
        items: { include: { product: true }, orderBy: { id: "asc" }, take: 3 },
      },
      orderBy: { createdAt: "desc" },
    }),
  ]);

  const scrapUnit = t("home.kpi.scrapUnit").trim();
  const producedYesterday = sumProducedInRange(batchRows, yesterdayStart, yesterdayEnd);

  const out = {} as OwnerDashboardSnapshots;
  for (const period of ["today", "week", "month"] as const) {
    const range = ranges[period];
    const profit = profitKpis[period];
    const scrap = sumScrapInRange(scrapRows, range.from, range.to);
    const produced = sumProducedInRange(batchRows, range.from, range.to);
    const hasScrap = scrap.gt(0);

    let producedHint = t("home.kpi.noChangeToday");
    let producedHintTone: "positive" | "negative" | "neutral" = "neutral";
    if (period === "today") {
      const pct = pctChange(produced, producedYesterday);
      if (pct !== null && pct > 0) {
        producedHint = t("home.kpi.vsYesterdayUp").replace("{pct}", String(pct));
        producedHintTone = "positive";
      } else if (pct !== null && pct < 0) {
        producedHint = t("home.kpi.vsYesterdayDown").replace("{pct}", String(Math.abs(pct)));
        producedHintTone = "negative";
      }
    } else if (period === "week") {
      producedHint = t("home.kpi.forWeek");
    } else {
      producedHint = t("home.kpi.forMonth");
    }

    const periodOrders = recentOrderRows
      .filter((o) => inRange(o.createdAt, range.from, range.to))
      .slice(0, 5)
      .map((o) => serializeRecentOrder(o, n));

    out[period] = {
      profitDisplay: moneyDisplay(profit.profit),
      profitNegative: profit.profit.lt(0),
      scrapValue: scrapUnit ? `${formatFgQty(scrap)} ${scrapUnit}` : formatFgQty(scrap),
      scrapHint: hasScrap ? t("home.kpi.scrapPeriodHint") : t("home.kpi.noScrapToday"),
      scrapHintTone: hasScrap ? "negative" : "neutral",
      hasScrap,
      producedValue: `${formatFgQty(produced)} м²`,
      producedHint,
      producedHintTone,
      recentOrders: periodOrders,
    };
  }

  return out;
  });
}
