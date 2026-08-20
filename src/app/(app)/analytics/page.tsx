import Link from "next/link";
import { prisma } from "@core/infrastructure/prisma";
import { requirePermission } from "@core/auth/authz";
import { D, moneyDisplay, qtyDisplay } from "@core/shared/decimal";
import { FUND, LEDGER, fundDelta } from "@core/finance/finance";
import { contributionAndNet } from "@core/finance/profit";
import { coverageAndPurchaseNeed } from "@core/inventory/alerts";
import { resolveProductionPaySchemeCode, getDomainConfig } from "@core/config/domain-config";
import { getTranslator } from "@core/shared/i18n/locale";
import { RevealList } from "@/components/reveal-list";
import styles from "@/styles/premium.module.css";

export default async function AnalyticsPage() {
  await requirePermission("analytics.view");
  const { t } = await getTranslator();
  const domainConfig = await getDomainConfig();
  const outputUnit = await prisma.unit.findUnique({ where: { code: domainConfig.product.defaultOutputUnit } });
  const outputUnitSymbol = outputUnit?.symbol ?? t("common.unitGeneric");
  const productionSchemeCode = await resolveProductionPaySchemeCode();
  const monthStart = new Date();
  monthStart.setDate(1);
  monthStart.setHours(0, 0, 0, 0);

  const [monthOrders, scraps, accruals, funds, entries, overUses, cover, productItems, prodScheme] = await Promise.all([
    prisma.order.findMany({
      where: { createdAt: { gte: monthStart }, status: { code: { not: "CANCELLED" } } },
      include: { payments: true },
    }),
    prisma.scrapRecord.findMany({
      where: { createdAt: { gte: monthStart } },
      include: {
        batch: {
          include: {
            production: {
              include: { order: { include: { items: { include: { product: { include: { outputUnit: true } } } } } } },
            },
          },
        },
      },
    }),
    prisma.payrollAccrual.groupBy({ by: ["kind"], where: { status: "ACCRUED" }, _sum: { amount: true } }),
    prisma.financialFund.findMany(),
    prisma.ledgerEntry.findMany({ where: { status: "POSTED" } }),
    prisma.batchMaterialUse.findMany({
      where: { batch: { status: "CLOSED" } },
      include: { material: true, batch: { include: { production: { include: { order: true } } } } },
    }),
    coverageAndPurchaseNeed(),
    prisma.orderItem.findMany({
      where: { order: { createdAt: { gte: monthStart }, status: { code: { not: "CANCELLED" } } } },
      include: {
        product: { include: { saleUnit: true } },
        order: { include: { materials: true, payments: true } },
      },
    }),
    prisma.payScheme.findUnique({ where: { code: productionSchemeCode } }),
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
  const over = overUses.filter((u) => {
    const plan = D(String(u.plannedQty));
    return plan.gt(0) && D(String(u.actualQty)).sub(plan).div(plan).mul(100).gte(5);
  });
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
  const rate = D(String(prodScheme?.productionRate ?? "0"));

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
    row.labor = row.labor.add(qtySale.mul(rate));
    const paid = item.order.payments.reduce((s, p) => s.add(String(p.amount)), D(0));
    const paidShare = orderTotal.gt(0) ? paid.mul(share) : D(0);
    row.commission = row.commission.add(paidShare.mul("0.03"));
    byProduct.set(key, row);
  }

  const scrapByUser = new Map<string, ReturnType<typeof D>>();
  const scrapByProduct = new Map<string, ReturnType<typeof D>>();
  for (const r of scraps) {
    const q = D(String(r.quantity));
    if (r.userId) scrapByUser.set(r.userId, (scrapByUser.get(r.userId) ?? D(0)).add(q));
    const pname = r.batch.production.order.items[0]?.product.name ?? "—";
    scrapByProduct.set(pname, (scrapByProduct.get(pname) ?? D(0)).add(q));
  }
  const users = scrapByUser.size
    ? await prisma.user.findMany({ where: { id: { in: [...scrapByUser.keys()] } } })
    : [];
  const userName = new Map(users.map((u) => [u.id, u.name]));

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <div className={styles.headerText}>
          <h1 className={styles.title}>{t("page.analytics")}</h1>
          <p className={styles.subtitle}>{t("an.pageHint")}</p>
        </div>
      </header>

      <div className={styles.kpiStrip} data-tour="an-kpis">
        <div className={`${styles.kpiBox} ${styles.kpiToneGood}`}>
          <p className={styles.kpiLabel}>{t("an.contrib")}</p>
          <p className={styles.kpiValueGood}>{moneyDisplay(contribution)} с</p>
          <p className={styles.kpiHint}>{t("an.contribHint")}</p>
        </div>
        <div className={`${styles.kpiBox} ${styles.kpiToneGood}`}>
          <p className={styles.kpiLabel}>{t("an.net")}</p>
          <p className={styles.kpiValueGood}>{moneyDisplay(net)} с</p>
          <p className={styles.kpiHint}>{t("an.netHint")}</p>
        </div>
        <div className={`${styles.kpiBox} ${styles.kpiToneInfo}`}>
          <p className={styles.kpiLabel}>{t("an.coverFor")}</p>
          <p className={styles.kpiValue}>
            {cover.coverQty ? `${cover.coverQty} (${cover.productName ?? ""})` : "—"}
          </p>
          <p className={styles.kpiHint}>{t("an.coverHint")}</p>
        </div>
        <div className={`${styles.kpiBox} ${styles.kpiToneBad}`}>
          <p className={styles.kpiLabel}>{t("an.scrapMonth")}</p>
          <p className={styles.kpiValueBad}>
            {qtyDisplay(scrapQty)} / {moneyDisplay(scrapCost)} с
          </p>
          <p className={styles.kpiHint}>{t("an.scrapKpiHint")}</p>
        </div>
      </div>

      <section className={styles.section}>
        <div className={styles.sectionHead}>
          <h2 className={styles.sectionTitleAccent}>{t("an.saleTotal")}</h2>
        </div>
        <div className={styles.sectionBody}>
          <ul style={{ margin: 0, padding: 0, listStyle: "none", fontSize: 13, lineHeight: "24px", color: "var(--ink-2)" }}>
            <li>{t("an.sale")}: {moneyDisplay(sold)} с</li>
            <li>{t("an.receivedReal")}: {moneyDisplay(received)} с</li>
            <li>{t("an.matCost")}: {moneyDisplay(materialCost)} с</li>
            <li>{t("an.payroll")}: {moneyDisplay(labor)} с</li>
            <li>{t("an.commission")}: {moneyDisplay(commission)} с</li>
            <li>{t("an.marginProfit")}: {moneyDisplay(contribution)} с</li>
            <li>{t("an.fixedExp")}: {moneyDisplay(expenses)} с</li>
            <li style={{ fontWeight: 700, color: "var(--ink)" }}>{t("an.netProfit")}: {moneyDisplay(net)} с</li>
            <li style={{ fontSize: 12, color: "var(--ink-3)" }}>
              {t("an.profitInCash")}: {moneyDisplay(profit)} с ·{" "}
              <Link href="/finance" className={styles.ghostLink} style={{ padding: 0, minHeight: 0 }}>
                {t("page.finance")}
              </Link>
            </li>
          </ul>
        </div>
      </section>

      <section className={styles.section}>
        <div className={styles.sectionHead}>
          <h2 className={styles.sectionTitle}>{t("an.byProduct")}</h2>
        </div>
        <div className={`${styles.tableWrap} ${styles.tableWrapFit}`}>
          <table className={`${styles.table} ${styles.tableDense}`}>
            <thead>
              <tr>
                <th>{t("common.product")}</th>
                <th className={styles.thRight}>{t("an.sold")}</th>
                <th className={styles.thRight}>{t("an.revenue")}</th>
                <th className={styles.thRight}>{t("an.avgPrice")}</th>
                <th className={styles.thRight}>{t("an.materials")}</th>
                <th className={styles.thRight}>{t("an.labor")}</th>
                <th className={styles.thRight}>{t("an.commission")}</th>
                <th className={styles.thRight}>{t("an.fullCost")}</th>
                <th className={styles.thRight}>{t("an.profit")}</th>
                <th className={styles.thRight}>{t("an.marginPct")}</th>
              </tr>
            </thead>
            {[...byProduct.values()].length === 0 ? (
              <tbody>
                <tr>
                  <td colSpan={10} className={styles.empty}>{t("an.noSales")}</td>
                </tr>
              </tbody>
            ) : (
              <RevealList as="tbody" moreLabel={t("home.seeAll")} lessLabel={t("home.hide")} limit={5}>
                {[...byProduct.values()].map((row) => {
                  const fullCost = row.materials.add(row.labor).add(row.commission);
                  const profitRow = row.revenue.sub(fullCost);
                  const margin = row.revenue.gt(0) ? profitRow.div(row.revenue).mul(100) : D(0);
                  const avg = row.qty.gt(0) ? row.revenue.div(row.qty) : D(0);
                  return (
                    <tr key={row.name}>
                      <td className={styles.tdBold}>{row.name}</td>
                      <td className={styles.tdRight}>{qtyDisplay(row.qty)} {row.unit}</td>
                      <td className={styles.tdRight}>{moneyDisplay(row.revenue)}</td>
                      <td className={styles.tdRight}>{moneyDisplay(avg)}</td>
                      <td className={styles.tdRight}>{moneyDisplay(row.materials)}</td>
                      <td className={styles.tdRight}>{moneyDisplay(row.labor)}</td>
                      <td className={styles.tdRight}>{moneyDisplay(row.commission)}</td>
                      <td className={styles.tdRight}>{moneyDisplay(fullCost)}</td>
                      <td className={styles.tdRight}>{moneyDisplay(profitRow)}</td>
                      <td className={styles.tdRight}>{margin.toFixed(1)}%</td>
                    </tr>
                  );
                })}
              </RevealList>
            )}
          </table>
        </div>
      </section>

      {over.length > 0 ? (
        <section className={styles.section} style={{ borderColor: "var(--warn)" }}>
          <div className={styles.sectionHead}>
            <h2 className={styles.sectionTitleAccent}>{t("an.overuse")}</h2>
          </div>
          <div className={styles.sectionBody}>
            <ul style={{ margin: 0, padding: 0, listStyle: "none", fontSize: 13, color: "var(--ink-2)" }}>
              {over.slice(0, 20).map((u) => (
                <li key={u.id}>
                  #{u.batch.production.order.number}: {u.material.name} {t("orders.plan")}{" "}
                  {qtyDisplay(u.plannedQty)}, {t("prod.actual")} {qtyDisplay(u.actualQty)}
                </li>
              ))}
            </ul>
          </div>
        </section>
      ) : null}

      <section className={styles.section}>
        <div className={styles.sectionHead}>
          <h2 className={styles.sectionTitle}>{t("an.scrapBy")}</h2>
        </div>
        <div className={styles.sectionBody}>
          <p style={{ fontSize: 13, color: "var(--ink-2)" }}>{t("an.scrapHint")}</p>
          <p style={{ fontSize: 12, color: "var(--ink-3)", marginTop: 2 }}>{t("an.periodMonth")}</p>
          {scrapByUser.size === 0 && scrapByProduct.size === 0 ? (
            <p style={{ marginTop: 8, fontSize: 13, color: "var(--ink-3)" }}>{t("an.noScrap")}</p>
          ) : (
            <div style={{ marginTop: 12 }}>
              {scrapByUser.size > 0 ? (
                <div>
                  <p style={{ fontSize: 12, fontWeight: 600, color: "var(--ink-3)", marginBottom: 4 }}>
                    {t("an.scrapPerson")}
                  </p>
                  <ul style={{ margin: 0, padding: 0, listStyle: "none" }}>
                    {[...scrapByUser.entries()].map(([id, q]) => (
                      <li
                        key={id}
                        style={{ display: "flex", justifyContent: "space-between", padding: "4px 0", fontSize: 13 }}
                      >
                        <span>{userName.get(id) ?? id}</span>
                        <span style={{ fontFamily: "var(--font-mono)", fontSize: 12, fontWeight: 600 }}>
                          {qtyDisplay(q)} {outputUnitSymbol}
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null}
              {scrapByProduct.size > 0 ? (
                <div style={{ marginTop: 12 }}>
                  <p style={{ fontSize: 12, fontWeight: 600, color: "var(--ink-3)", marginBottom: 4 }}>
                    {t("an.scrapProduct")}
                  </p>
                  <ul style={{ margin: 0, padding: 0, listStyle: "none" }}>
                    {[...scrapByProduct.entries()].map(([name, q]) => (
                      <li
                        key={name}
                        style={{ display: "flex", justifyContent: "space-between", padding: "4px 0", fontSize: 13 }}
                      >
                        <span>{name}</span>
                        <span style={{ fontFamily: "var(--font-mono)", fontSize: 12, fontWeight: 600 }}>
                          {qtyDisplay(q)} {outputUnitSymbol}
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null}
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
