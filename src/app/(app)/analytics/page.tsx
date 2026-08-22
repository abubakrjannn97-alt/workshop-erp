import Link from "next/link";
import { prisma } from "@core/infrastructure/prisma";
import { requirePermission } from "@core/auth/authz";
import { D, moneyDisplay, qtyDisplay } from "@core/shared/decimal";
import { productLaborRate } from "@core/payroll/labor-rate";
import { FUND, LEDGER, fundDelta } from "@core/finance/finance";
import { contributionAndNet } from "@core/finance/profit";
import { getTranslator, intlLocale } from "@core/shared/i18n/locale";
import { orderPeriodLabel, resolveOrderDateRange, type OrderPeriod } from "@core/shared/order-period";
import { Segmented } from "@/components/segmented";
import { AnalyticsProductsSection } from "./analytics-products-section";
import styles from "./analytics.module.css";

type AnalyticsPeriod = Extract<OrderPeriod, "today" | "week" | "month" | "all">;

function parsePeriod(raw?: string): AnalyticsPeriod {
  if (raw === "today" || raw === "week" || raw === "month" || raw === "all") return raw;
  return "month";
}

function createdAtRange(from?: Date, to?: Date) {
  if (from && to) return { gte: from, lte: to };
  return undefined;
}

export default async function AnalyticsPage({
  searchParams,
}: {
  searchParams: Promise<{ period?: string }>;
}) {
  await requirePermission("analytics.view");
  const { t, locale } = await getTranslator();
  const params = await searchParams;
  const period = parsePeriod(params.period);
  const range = resolveOrderDateRange({ period });
  const dateFilter = createdAtRange(range.from, range.to);
  const rangeLabel = orderPeriodLabel(period, t, range.from, range.to);
  const loc = intlLocale(locale);

  const orderWhere = {
    ...(dateFilter ? { createdAt: dateFilter } : {}),
    status: { code: { not: "CANCELLED" } },
  };

  const [periodOrders, scraps, accruals, funds, periodEntries, fundEntries, productItems] = await Promise.all([
    prisma.order.findMany({
      where: orderWhere,
      include: { payments: true },
    }),
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
      where: {
        status: "ACCRUED",
        ...(dateFilter ? { createdAt: dateFilter } : {}),
      },
      _sum: { amount: true },
    }),
    prisma.financialFund.findMany(),
    prisma.ledgerEntry.findMany({
      where: {
        status: "POSTED",
        ...(dateFilter ? { createdAt: dateFilter } : {}),
      },
    }),
    prisma.ledgerEntry.findMany({ where: { status: "POSTED" } }),
    prisma.orderItem.findMany({
      where: { order: orderWhere },
      include: {
        product: { include: { saleUnit: true } },
        order: { include: { payments: true } },
      },
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
  const { net } = contributionAndNet({
    revenue: sold,
    materialCost,
    labor,
    commission,
    fixedExpenses,
  });
  const netPositive = net.gte(0);
  const payrollTotal = labor.add(commission);
  const totalExpenses = materialCost.add(payrollTotal).add(fixedExpenses);

  type ProdRow = {
    name: string;
    unit: string;
    qty: ReturnType<typeof D>;
    revenue: ReturnType<typeof D>;
    materials: ReturnType<typeof D>;
    labor: ReturnType<typeof D>;
    commission: ReturnType<typeof D>;
  };
  const byProduct = new Map<string, ProdRow>();
  for (const item of productItems) {
    const key = item.productId;
    const row =
      byProduct.get(key) ??
      ({
        name: item.product.name,
        unit: item.product.saleUnit.symbol,
        qty: D(0),
        revenue: D(0),
        materials: D(0),
        labor: D(0),
        commission: D(0),
      } satisfies ProdRow);
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
    byProduct.set(key, row);
  }

  const productRows = [...byProduct.values()];

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <h1 className={styles.title}>{t("page.analytics")}</h1>
      </header>

      <div className={styles.periodWrap} data-tour="an-period">
        <Segmented
          className={styles.periodSeg}
          aria-label={t("orders.period")}
          items={[
            { href: "/analytics?period=today", label: t("orders.periodToday"), active: period === "today" },
            { href: "/analytics?period=week", label: t("orders.periodWeek"), active: period === "week" },
            { href: "/analytics?period=month", label: t("orders.periodMonth"), active: period === "month" },
            { href: "/analytics?period=all", label: t("orders.periodAll"), active: period === "all" },
          ]}
        />
      </div>

      <section className={styles.turnoverSection} data-tour="an-turnover">
        <div className={styles.turnoverHead}>
          <h2 className={styles.turnoverTitle}>{t("an.workshopTurnover")}</h2>
          <p className={styles.turnoverRange}>{rangeLabel}</p>
        </div>
        <p className={styles.turnoverValue}>{moneyDisplay(sold)} с</p>

        <div className={styles.summaryRow} data-tour="an-summary">
          <article className={`${styles.summaryCard} ${netPositive ? styles.summaryOk : styles.summaryBad}`}>
            <p className={styles.summaryLabel}>{t("an.net")}</p>
            <p className={styles.summaryValue}>{moneyDisplay(net)} с</p>
            <p className={styles.summaryMeta}>{netPositive ? t("an.netOkSub") : t("an.netBadSub")}</p>
          </article>
          <article className={`${styles.summaryCard} ${styles.summaryMuted}`}>
            <p className={styles.summaryLabel}>{t("an.totalExpenses")}</p>
            <p className={styles.summaryValue}>{moneyDisplay(totalExpenses)} с</p>
            <p className={styles.summaryMeta}>{rangeLabel}</p>
          </article>
          <article className={`${styles.summaryCard} ${styles.summaryScrap}`}>
            <p className={styles.summaryLabel}>{t("an.scrapMonth")}</p>
            <p className={styles.summaryValue}>{qtyDisplay(scrapQty)} м²</p>
            <p className={styles.summaryMeta}>
              {scrapCost.gt(0) ? (
                <>
                  {t("an.scrapDamage")}: <strong>{moneyDisplay(scrapCost)} с</strong>
                </>
              ) : (
                t("an.scrapNone")
              )}
            </p>
          </article>
        </div>
      </section>

      <section className={styles.card}>
        <div className={styles.cardHead}>
          <h2 className={styles.cardTitle}>{t("an.saleTotal")}</h2>
        </div>
        <ul className={styles.rows}>
          <li className={styles.row}>
            <span>{t("an.sale")}</span>
            <strong>{moneyDisplay(sold)} с</strong>
          </li>
          <li className={styles.row}>
            <span>{t("an.receivedReal")}</span>
            <strong>{moneyDisplay(received)} с</strong>
          </li>
          <li className={`${styles.row} ${styles.rowMuted}`}>
            <span>{t("an.matCost")}</span>
            <strong>−{moneyDisplay(materialCost)} с</strong>
          </li>
          <li className={`${styles.row} ${styles.rowMuted}`}>
            <span>{t("an.payrollShort")}</span>
            <strong>−{moneyDisplay(payrollTotal)} с</strong>
          </li>
          <li className={`${styles.row} ${styles.rowMuted}`}>
            <span>{t("an.fixedExp")}</span>
            <strong>−{moneyDisplay(fixedExpenses)} с</strong>
          </li>
        </ul>
        <div className={styles.rowFoot}>
          <span>
            {t("an.profitInCash")}: <strong>{moneyDisplay(profit)} с</strong>
          </span>
          <Link href="/finance" className={styles.link}>
            {t("page.finance")}
          </Link>
        </div>
      </section>

      {scraps.length > 0 ? (
        <section className={styles.card}>
          <div className={styles.cardHead}>
            <h2 className={styles.cardTitle}>{t("an.scrapBy")}</h2>
          </div>
          <ul className={styles.scrapList}>
            {scraps.map((s) => {
              const product = s.batch.production.order.items[0]?.product;
              const unitSymbol = product?.outputUnit?.symbol ?? t("common.unitGeneric");
              const damage = D(String(s.materialCost ?? 0));
              return (
                <li key={s.id} className={styles.scrapRow}>
                  <div className={styles.scrapMain}>
                    <p className={styles.scrapName}>{product?.name ?? "—"}</p>
                    <p className={styles.scrapWhen}>{s.createdAt.toLocaleDateString(loc)}</p>
                  </div>
                  <div className={styles.scrapRight}>
                    <p className={styles.scrapQty}>
                      {qtyDisplay(s.quantity)} {unitSymbol}
                    </p>
                    {damage.gt(0) ? (
                      <p className={styles.scrapDamageLine}>
                        {t("an.scrapDamage")}: <strong>{moneyDisplay(damage)} с</strong>
                      </p>
                    ) : null}
                  </div>
                </li>
              );
            })}
          </ul>
        </section>
      ) : null}

      <AnalyticsProductsSection locale={locale} count={productRows.length}>
        <ul className={styles.productList}>
          {productRows.map((row) => {
            const fullCost = row.materials.add(row.labor).add(row.commission);
            const profitRow = row.revenue.sub(fullCost);
            const margin = row.revenue.gt(0) ? profitRow.div(row.revenue).mul(100) : D(0);
            const ok = profitRow.gte(0);
            return (
              <li key={row.name} className={styles.productCard}>
                <p className={styles.productName}>{row.name}</p>
                <div className={styles.productGrid}>
                  <div className={styles.productStat}>
                    <span className={styles.productStatLabel}>{t("an.sold")}</span>
                    <span className={styles.productStatValue}>
                      {qtyDisplay(row.qty)} {row.unit}
                    </span>
                  </div>
                  <div className={styles.productStat}>
                    <span className={styles.productStatLabel}>{t("an.revenue")}</span>
                    <span className={styles.productStatValue}>{moneyDisplay(row.revenue)} с</span>
                  </div>
                  <div className={styles.productStat}>
                    <span className={styles.productStatLabel}>{t("an.fullCost")}</span>
                    <span className={styles.productStatValue}>{moneyDisplay(fullCost)} с</span>
                  </div>
                  <div className={styles.productStat}>
                    <span className={styles.productStatLabel}>{t("an.profit")}</span>
                    <span className={`${styles.productStatValue} ${ok ? styles.productStatOk : styles.productStatBad}`}>
                      {moneyDisplay(profitRow)} с · {margin.toFixed(0)}%
                    </span>
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      </AnalyticsProductsSection>
    </div>
  );
}
