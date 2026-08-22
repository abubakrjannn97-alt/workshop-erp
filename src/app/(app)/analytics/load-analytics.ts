import { prisma } from "@core/infrastructure/prisma";
import { D, money, qtyDisplay } from "@core/shared/decimal";
import { productLaborRate } from "@core/payroll/labor-rate";
import { FUND, LEDGER, fundDelta } from "@core/finance/finance";
import { contributionAndNet } from "@core/finance/profit";
import { orderPeriodLabel, resolveOrderDateRange, type OrderPeriod } from "@core/shared/order-period";
import { intlLocale, type Locale } from "@core/shared/i18n/i18n";

export type AnalyticsPeriod = Extract<OrderPeriod, "today" | "week" | "month" | "all">;

export type AnalyticsProductRow = {
  name: string;
  unit: string;
  qty: string;
  revenue: string;
  fullCost: string;
  profit: string;
  margin: string;
  ok: boolean;
};

export type AnalyticsScrapRow = {
  id: string;
  productName: string;
  when: string;
  qty: string;
  damage: string | null;
};

export type AnalyticsReportData = {
  period: AnalyticsPeriod;
  rangeLabel: string;
  sold: string;
  received: string;
  profit: string;
  materialCost: string;
  payrollTotal: string;
  fixedExpenses: string;
  net: string;
  netPositive: boolean;
  totalExpenses: string;
  scrapQty: string;
  scrapCost: string;
  scrapHasCost: boolean;
  scraps: AnalyticsScrapRow[];
  products: AnalyticsProductRow[];
};

function parsePeriod(raw?: string): AnalyticsPeriod {
  if (raw === "today" || raw === "week" || raw === "month" || raw === "all") return raw;
  return "month";
}

function createdAtRange(from?: Date, to?: Date) {
  if (from && to) return { gte: from, lte: to };
  return undefined;
}

type ProdAcc = {
  name: string;
  unit: string;
  qty: ReturnType<typeof D>;
  revenue: ReturnType<typeof D>;
  materials: ReturnType<typeof D>;
  labor: ReturnType<typeof D>;
  commission: ReturnType<typeof D>;
};

export async function loadAnalyticsReport(
  periodRaw: string | undefined,
  t: (key: string) => string,
  locale: Locale,
): Promise<AnalyticsReportData> {
  const period = parsePeriod(periodRaw);
  const range = resolveOrderDateRange({ period });
  const dateFilter = createdAtRange(range.from, range.to);
  const rangeLabel = orderPeriodLabel(period, t, range.from, range.to);
  const loc = intlLocale(locale);

  const orderWhere = {
    ...(dateFilter ? { createdAt: dateFilter } : {}),
    status: { code: { not: "CANCELLED" } },
  };

  const [periodOrders, scraps, accruals, funds, periodEntries, fundEntries, productItems] = await Promise.all([
    prisma.order.findMany({ where: orderWhere, include: { payments: true } }),
    prisma.scrapRecord.findMany({
      where: dateFilter ? { createdAt: dateFilter } : undefined,
      include: {
        batch: {
          include: {
            production: {
              include: {
                order: {
                  include: {
                    items: { include: { product: { include: { outputUnit: true } } } },
                  },
                },
              },
            },
          },
        },
      },
      orderBy: { createdAt: "desc" },
    }),
    prisma.payrollAccrual.groupBy({
      by: ["kind"],
      where: { status: "ACCRUED", ...(dateFilter ? { createdAt: dateFilter } : {}) },
      _sum: { amount: true },
    }),
    prisma.financialFund.findMany(),
    prisma.ledgerEntry.findMany({
      where: { status: "POSTED", ...(dateFilter ? { createdAt: dateFilter } : {}) },
    }),
    prisma.ledgerEntry.findMany({ where: { status: "POSTED" } }),
    prisma.orderItem.findMany({
      where: { order: orderWhere },
      include: { product: { include: { saleUnit: true } }, order: { include: { payments: true } } },
    }),
  ]);

  const sold = periodOrders.reduce((s, o) => s.add(String(o.total)), D(0));
  const received = periodOrders.reduce(
    (s, o) => s.add(o.payments.reduce((p, pay) => p.add(String(pay.amount)), D(0))),
    D(0),
  );
  const profitFund = funds.find((f) => f.code === FUND.PROFIT);
  const profit = profitFund ? fundEntries.reduce((s, e) => s.add(fundDelta(e, profitFund.id)), D(0)) : D(0);
  const labor = D(String(accruals.find((a) => a.kind === "PRODUCTION")?._sum.amount ?? 0));
  const commission = D(String(accruals.find((a) => a.kind === "COMMISSION")?._sum.amount ?? 0));
  const scrapQty = scraps.reduce((s, r) => s.add(String(r.quantity)), D(0));
  const scrapCost = scraps.reduce((s, r) => s.add(String(r.materialCost ?? 0)), D(0));
  const materialCost = periodOrders.reduce((s, o) => s.add(String(o.materialCost ?? 0)), D(0));
  const fixedExpenses = periodEntries
    .filter((e) => e.type === LEDGER.CASH_OUT && e.categoryId)
    .reduce((s, e) => s.add(String(e.amount)), D(0));
  const { net } = contributionAndNet({ revenue: sold, materialCost, labor, commission, fixedExpenses });
  const payrollTotal = labor.add(commission);
  const totalExpenses = materialCost.add(payrollTotal).add(fixedExpenses);

  const byProduct: Map<string, ProdAcc> = new Map();
  for (const item of productItems) {
    const key = item.productId;
    let row = byProduct.get(key);
    if (!row) {
      row = {
        name: item.product.name,
        unit: item.product.saleUnit.symbol,
        qty: D(0),
        revenue: D(0),
        materials: D(0),
        labor: D(0),
        commission: D(0),
      };
      byProduct.set(key, row);
    }
    const qtySale = D(String(item.quantity));
    const amount = D(String(item.amount));
    row.qty = row.qty.add(qtySale);
    row.revenue = row.revenue.add(amount);
    const orderTotal = D(String(item.order.total));
    const share = orderTotal.gt(0) ? amount.div(orderTotal) : D(0);
    row.materials = row.materials.add(D(String(item.order.materialCost ?? 0)).mul(share));
    row.labor = row.labor.add(qtySale.mul(productLaborRate()));
    const paid = item.order.payments.reduce((s, p) => s.add(String(p.amount)), D(0));
    const paidShare = orderTotal.gt(0) ? paid.mul(share) : D(0);
    row.commission = row.commission.add(paidShare.mul("0.03"));
  }

  const products: AnalyticsProductRow[] = [...byProduct.values()].map((row) => {
    const fullCost = row.materials.add(row.labor).add(row.commission);
    const profitRow = row.revenue.sub(fullCost);
    const margin = row.revenue.gt(0) ? profitRow.div(row.revenue).mul(100) : D(0);
    return {
      name: row.name,
      unit: row.unit,
      qty: qtyDisplay(row.qty),
      revenue: money(row.revenue),
      fullCost: money(fullCost),
      profit: money(profitRow),
      margin: margin.toFixed(0),
      ok: profitRow.gte(0),
    };
  });

  const scrapRows: AnalyticsScrapRow[] = scraps.map((s) => {
    const product = s.batch.production.order.items[0]?.product;
    const unitSymbol = product?.outputUnit?.symbol ?? t("common.unitGeneric");
    const damage = D(String(s.materialCost ?? 0));
    return {
      id: s.id,
      productName: product?.name ?? "—",
      when: s.createdAt.toLocaleDateString(loc),
      qty: `${qtyDisplay(s.quantity)} ${unitSymbol}`,
      damage: damage.gt(0) ? money(damage) : null,
    };
  });

  return {
    period,
    rangeLabel,
    sold: money(sold),
    received: money(received),
    profit: money(profit),
    materialCost: money(materialCost),
    payrollTotal: money(payrollTotal),
    fixedExpenses: money(fixedExpenses),
    net: money(net),
    netPositive: net.gte(0),
    totalExpenses: money(totalExpenses),
    scrapQty: qtyDisplay(scrapQty),
    scrapCost: money(scrapCost),
    scrapHasCost: scrapCost.gt(0),
    scraps: scrapRows,
    products,
  };
}
