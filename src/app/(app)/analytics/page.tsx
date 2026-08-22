import Link from "next/link";
import { prisma } from "@core/infrastructure/prisma";
import { requirePermission } from "@core/auth/authz";
import { D, moneyDisplay, qtyDisplay } from "@core/shared/decimal";
import { productLaborRate } from "@core/payroll/labor-rate";
import { FUND, LEDGER, fundDelta } from "@core/finance/finance";
import { contributionAndNet } from "@core/finance/profit";
import { getTranslator } from "@core/shared/i18n/locale";
import { RevealList } from "@/components/reveal-list";
import styles from "./analytics.module.css";

export default async function AnalyticsPage() {
  await requirePermission("analytics.view");
  const { t } = await getTranslator();
  const monthStart = new Date();
  monthStart.setDate(1);
  monthStart.setHours(0, 0, 0, 0);
  const [monthOrders, scraps, accruals, funds, entries, productItems] = await Promise.all([
    prisma.order.findMany({
      where: { createdAt: { gte: monthStart }, status: { code: { not: "CANCELLED" } } },
      include: { payments: true },
    }),
    prisma.scrapRecord.findMany({
      where: { createdAt: { gte: monthStart } },
    }),
    prisma.payrollAccrual.groupBy({ by: ["kind"], where: { status: "ACCRUED" }, _sum: { amount: true } }),
    prisma.financialFund.findMany(),
    prisma.ledgerEntry.findMany({ where: { status: "POSTED" } }),
    prisma.orderItem.findMany({
      where: { order: { createdAt: { gte: monthStart }, status: { code: { not: "CANCELLED" } } } },
      include: {
        product: { include: { saleUnit: true } },
        order: { include: { payments: true } },
      },
    }),
  ]);

  const sold = monthOrders.reduce((s, o) => s.add(String(o.total)), D(0));
  const received = monthOrders.reduce(
    (s, o) => s.add(o.payments.reduce((p, pay) => p.add(String(pay.amount)), D(0))),
    D(0),
  );
  const profitFund = funds.find((f) => f.code === FUND.PROFIT);
  const profit = profitFund ? entries.reduce((s, e) => s.add(fundDelta(e, profitFund.id)), D(0)) : D(0);
  const labor = D(String(accruals.find((a) => a.kind === "PRODUCTION")?._sum.amount ?? 0));
  const commission = D(String(accruals.find((a) => a.kind === "COMMISSION")?._sum.amount ?? 0));
  const scrapQty = scraps.reduce((s, r) => s.add(String(r.quantity)), D(0));
  const scrapCost = scraps.reduce((s, r) => s.add(String(r.materialCost ?? 0)), D(0));
  const materialCost = monthOrders.reduce((s, o) => s.add(String(o.materialCost ?? 0)), D(0));
  const expenses = entries
    .filter((e) => e.type === LEDGER.CASH_OUT && e.categoryId)
    .reduce((s, e) => s.add(String(e.amount)), D(0));
  const { contribution, net } = contributionAndNet({
    revenue: sold,
    materialCost,
    labor,
    commission,
    fixedExpenses: expenses,
  });
  const netPositive = net.gte(0);
  const payrollTotal = labor.add(commission);

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
        <p className={styles.period}>{t("an.thisMonth")}</p>
      </header>

      <section className={`${styles.hero} ${netPositive ? styles.heroOk : styles.heroBad}`} data-tour="an-kpis">
        <p className={styles.heroLabel}>{t("an.net")}</p>
        <p className={styles.heroValue}>{moneyDisplay(net)} с</p>
        <p className={styles.heroSub}>
          {netPositive ? t("an.netOkSub") : t("an.netBadSub")}
        </p>
      </section>

      <div className={styles.kpiRow}>
        <article className={`${styles.kpi} ${styles.kpiGold}`}>
          <p className={styles.kpiLabel}>{t("an.contrib")}</p>
          <p className={styles.kpiValue}>{moneyDisplay(contribution)} с</p>
          <p className={styles.kpiMeta}>{t("an.contribShort")}</p>
        </article>
        <article className={`${styles.kpi} ${styles.kpiRed}`}>
          <p className={styles.kpiLabel}>{t("an.scrapMonth")}</p>
          <p className={styles.kpiValue}>{qtyDisplay(scrapQty)}</p>
          <p className={styles.kpiMeta}>
            {scrapCost.gt(0) ? `${moneyDisplay(scrapCost)} с` : t("an.scrapNone")}
          </p>
        </article>
      </div>

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
            <strong>−{moneyDisplay(expenses)} с</strong>
          </li>
          <li
            className={`${styles.row} ${styles.rowTotal} ${
              netPositive ? styles.rowTotalOk : styles.rowTotalBad
            }`}
          >
            <span>{t("an.netProfit")}</span>
            <strong>{moneyDisplay(net)} с</strong>
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

      <section className={styles.card}>
        <div className={styles.cardHead}>
          <h2 className={styles.cardTitle}>{t("an.byProduct")}</h2>
        </div>

        {productRows.length === 0 ? (
          <p className={styles.empty}>{t("an.noSales")}</p>
        ) : (
          <>
            <RevealList as="ul" className={styles.productList} moreLabel={t("home.seeAll")} lessLabel={t("home.hide")} limit={5}>
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
                        <span
                          className={`${styles.productStatValue} ${
                            ok ? styles.productStatOk : styles.productStatBad
                          }`}
                        >
                          {moneyDisplay(profitRow)} с · {margin.toFixed(0)}%
                        </span>
                      </div>
                    </div>
                  </li>
                );
              })}
            </RevealList>

            <div className={styles.tableWrap}>
              <table className={styles.table}>
                <thead>
                  <tr>
                    <th>{t("common.product")}</th>
                    <th className={styles.thRight}>{t("an.sold")}</th>
                    <th className={styles.thRight}>{t("an.revenue")}</th>
                    <th className={styles.thRight}>{t("an.fullCost")}</th>
                    <th className={styles.thRight}>{t("an.profit")}</th>
                    <th className={styles.thRight}>{t("an.marginPct")}</th>
                  </tr>
                </thead>
                <tbody>
                  {productRows.map((row) => {
                    const fullCost = row.materials.add(row.labor).add(row.commission);
                    const profitRow = row.revenue.sub(fullCost);
                    const margin = row.revenue.gt(0) ? profitRow.div(row.revenue).mul(100) : D(0);
                    return (
                      <tr key={row.name}>
                        <td className={styles.tdBold}>{row.name}</td>
                        <td className={styles.tdRight}>
                          {qtyDisplay(row.qty)} {row.unit}
                        </td>
                        <td className={styles.tdRight}>{moneyDisplay(row.revenue)}</td>
                        <td className={styles.tdRight}>{moneyDisplay(fullCost)}</td>
                        <td className={styles.tdRight}>{moneyDisplay(profitRow)}</td>
                        <td className={styles.tdRight}>{margin.toFixed(1)}%</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </>
        )}
      </section>
    </div>
  );
}
