import { PageHeader } from "@/components/page-header";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@core/auth/authz";
import { D, moneyDisplay, qtyDisplay } from "@core/shared/decimal";
import { FUND, LEDGER, fundDelta } from "@core/finance/finance";
import { contributionAndNet } from "@core/finance/profit";
import { coverageAndPurchaseNeed } from "@core/inventory/alerts";
import { resolveRawWarehouseCode } from "@/core/config/resolve-warehouse";
import { resolveProductionPaySchemeCode } from "@core/config/domain-config";
import { getTranslator } from "@core/shared/i18n/locale";
import { KpiCard } from "@/components/kpi-card";
import { RevealList } from "@/components/reveal-list";
import { CustomerRef } from "@/components/entity-ref";
import { StatusBadge, orderTone } from "@/components/status-badge";

export default async function AnalyticsPage() {
  await requirePermission("analytics.view");
  const { t, n } = await getTranslator();
  const [rawCode, productionSchemeCode] = await Promise.all([
    resolveRawWarehouseCode(),
    resolveProductionPaySchemeCode(),
  ]);
  const monthStart = new Date();
  monthStart.setDate(1);
  monthStart.setHours(0, 0, 0, 0);

  const [
    monthOrders,
    unpaid,
    overdue,
    inProd,
    lowMaterials,
    rawItems,
    scraps,
    accruals,
    funds,
    entries,
    purchaseOrders,
    overUses,
    scrapsFull,
    cover,
    productItems,
    prodScheme,
  ] = await Promise.all([
    prisma.order.findMany({
      where: { createdAt: { gte: monthStart }, status: { code: { not: "CANCELLED" } } },
      include: { payments: true },
    }),
    prisma.order.findMany({
      where: { paymentStatus: { in: ["unpaid", "partial"] }, status: { code: { not: "CANCELLED" } } },
    }),
    prisma.order.findMany({
      where: {
        dueAt: { lt: new Date() },
        status: { code: { notIn: ["COMPLETED", "CANCELLED", "ISSUED"] } },
      },
      include: { customer: true, status: true },
    }),
    prisma.productionOrder.findMany({
      where: { status: { in: ["OPEN", "IN_PROGRESS"] } },
      include: { order: { include: { customer: true, items: { include: { product: true } } } } },
    }),
    prisma.material.findMany({
      where: { archivedAt: null, isActive: true },
      include: { storageUnit: true, stockItems: true },
    }),
    prisma.stockItem.findMany({
      where: { warehouse: { code: rawCode }, materialId: { not: null } },
      include: { material: true },
    }),
    prisma.scrapRecord.findMany({ where: { createdAt: { gte: monthStart } } }),
    prisma.payrollAccrual.groupBy({
      by: ["kind"],
      where: { status: "ACCRUED" },
      _sum: { amount: true },
    }),
    prisma.financialFund.findMany(),
    prisma.ledgerEntry.findMany({ where: { status: "POSTED" } }),
    prisma.purchaseOrder.findMany({ where: { status: { not: "CANCELLED" } } }),
    prisma.batchMaterialUse.findMany({
      where: { batch: { status: "CLOSED" } },
      include: { material: true, batch: { include: { production: { include: { order: true } } } } },
    }),
    prisma.scrapRecord.findMany({
      where: { createdAt: { gte: monthStart } },
      include: {
        batch: {
          include: {
            production: { include: { order: { include: { items: { include: { product: { include: { outputUnit: true } } } } } } } },
          },
        },
      },
    }),
    coverageAndPurchaseNeed(),
    prisma.orderItem.findMany({
      where: {
        order: { createdAt: { gte: monthStart }, status: { code: { not: "CANCELLED" } } },
      },
      include: {
        product: { include: { saleUnit: true } },
        order: {
          include: {
            materials: true,
            payments: true,
            seller: { include: { payScheme: { include: { tiers: true } } } },
          },
        },
      },
    }),
    prisma.payScheme.findUnique({ where: { code: productionSchemeCode } }),
  ]);

  const sold = monthOrders.reduce((s, o) => s.add(String(o.total)), D(0));
  const received = monthOrders.reduce(
    (s, o) => s.add(o.payments.reduce((p, pay) => p.add(String(pay.amount)), D(0))),
    D(0),
  );
  const clientDebt = unpaid.reduce((s, o) => s.add(D(String(o.total)).sub(o.paidAmount)), D(0));
  const weOwe = purchaseOrders.reduce((s, o) => s.add(D(String(o.total)).sub(o.paidAmount)), D(0));
  const profitFund = funds.find((f) => f.code === FUND.PROFIT);
  const profit = profitFund
    ? entries.reduce((s, e) => s.add(fundDelta(e, profitFund.id)), D(0))
    : D(0);
  const labor = D(String(accruals.find((a) => a.kind === "PRODUCTION")?._sum.amount ?? 0));
  const commission = D(String(accruals.find((a) => a.kind === "COMMISSION")?._sum.amount ?? 0));
  const scrapQty = scraps.reduce((s, r) => s.add(String(r.quantity)), D(0));
  const scrapCost = scraps.reduce((s, r) => s.add(String(r.materialCost ?? 0)), D(0));
  const critical = lowMaterials.filter((m) => {
    const onHand = m.stockItems.reduce((s, i) => s.add(i.qtyOnHand), D(0));
    return onHand.lte(m.minStock);
  });
  const over = overUses.filter((u) => {
    const plan = D(String(u.plannedQty));
    return plan.gt(0) && D(String(u.actualQty)).sub(plan).div(plan).mul(100).gte(5);
  });
  const reserved = funds
    .filter((f) => f.code !== FUND.PROFIT)
    .reduce((s, f) => s.add(entries.reduce((e, row) => e.add(fundDelta(row, f.id)), D(0))), D(0));
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
  const rate = D(String(prodScheme?.productionRate ?? "22"));

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
    // комиссия приблизительно 3% с доли оплат (точная по тирам — в payroll)
    row.commission = row.commission.add(paidShare.mul("0.03"));
    byProduct.set(key, row);
  }

  const scrapByUser = new Map<string, ReturnType<typeof D>>();
  const scrapByProduct = new Map<string, ReturnType<typeof D>>();
  for (const r of scrapsFull) {
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
    <div className="page-stack">
      <div>
        <PageHeader title={t("page.analytics")} />
        <p className="mt-2 flex flex-wrap gap-3 text-sm" data-tour="an-export">
          <a href="/api/export/sales" className="text-[var(--titan-dark)] hover:underline">{t("an.salesCsv")}</a>
          <a href="/api/export/sales?format=xls" className="text-[var(--titan-dark)] hover:underline">Excel</a>
          <a href="/api/export/warehouse" className="text-[var(--titan-dark)] hover:underline">{t("an.whCsv")}</a>
          <a href="/api/export/payroll" className="text-[var(--titan-dark)] hover:underline">{t("an.payrollCsv")}</a>
          <a href="/api/export/profit" className="text-[var(--titan-dark)] hover:underline">{t("an.profitCsv")}</a>
          <a href="/api/export/debts" className="text-[var(--titan-dark)] hover:underline">{t("an.debtsCsv")}</a>
        </p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4" data-tour="an-kpis">
        <KpiCard href="/sales" label={t("an.soldMonth")} value={`${moneyDisplay(sold)} с`} hint={t("home.period")} tone="in" />
        <KpiCard href="/sales" label={t("an.receivedReal")} value={`${moneyDisplay(received)} с`} hint={t("home.period")} tone="in" />
        <KpiCard href="/sales" label={t("an.clientsOwe")} value={`${moneyDisplay(clientDebt)} с`} hint={t("home.period")} tone="out" />
        <KpiCard href="/purchasing" label={t("an.weOwe")} value={`${moneyDisplay(weOwe)} с`} hint={t("home.period")} tone="out" />
        <KpiCard href="/finance" label={t("an.contrib")} value={`${moneyDisplay(contribution)} с`} tone="in" />
        <KpiCard href="/finance" label={t("an.net")} value={`${moneyDisplay(net)} с`} tone="in" />
        <KpiCard href="/finance" label={t("an.profitFund")} value={`${moneyDisplay(profit)} с`} tone="in" />
        <KpiCard href="/finance" label={t("an.reserved")} value={`${moneyDisplay(reserved)} с`} tone="ink" />
        <KpiCard href="/employees" label={t("an.laborAccrued")} value={`${moneyDisplay(labor)} с`} tone="out" />
        <KpiCard href="/employees" label={t("an.commAccrued")} value={`${moneyDisplay(commission)} с`} tone="out" />
        <KpiCard href="/production" label={t("an.scrapMonth")} value={`${qtyDisplay(scrapQty)} / ${moneyDisplay(scrapCost)} с`} tone="out" />
        <KpiCard
          href="/warehouse"
          label={t("an.coverFor")}
          value={cover.coverQty ? `${cover.coverQty} (${cover.productName ?? ""})` : "—"}
          tone="ink"
        />
      </div>

      <section className="ui-card">
        <h2 className="text-sm font-semibold">{t("an.saleTotal")}</h2>
        <ul className="mt-2 space-y-1 text-sm">
          <li>{t("an.sale")}: {moneyDisplay(sold)} с</li>
          <li>{t("an.matCost")}: {moneyDisplay(materialCost)} с</li>
          <li>{t("an.payroll")}: {moneyDisplay(labor)} с</li>
          <li>{t("an.commission")}: {moneyDisplay(commission)} с</li>
          <li>{t("an.marginProfit")}: {moneyDisplay(contribution)} с</li>
          <li>{t("an.fixedExp")}: {moneyDisplay(expenses)} с</li>
          <li className="font-semibold">{t("an.netProfit")}: {moneyDisplay(net)} с</li>
          <li className="text-xs text-[var(--muted)]">{t("an.profitInCash")}: {moneyDisplay(profit)} с</li>
        </ul>
      </section>

      <section className="overflow-x-auto ui-card">
        <div className="border-b border-[var(--line)] px-5 py-3">
          <h2 className="text-sm font-semibold">{t("an.byProduct")}</h2>
          </div>
        <table className="w-full min-w-[720px] text-left text-sm">
          <thead className="bg-[var(--surface-muted)] text-xs text-[var(--muted)]">
            <tr>
              <th className="px-4 py-2">{t("common.product")}</th>
              <th className="px-4 py-2">{t("an.sold")}</th>
              <th className="px-4 py-2">{t("an.revenue")}</th>
              <th className="px-4 py-2">{t("an.avgPrice")}</th>
              <th className="px-4 py-2">{t("an.materials")}</th>
              <th className="px-4 py-2">{t("an.labor")}</th>
              <th className="px-4 py-2">{t("an.commission")}, с</th>
              <th className="px-4 py-2">{t("an.fullCost")}</th>
              <th className="px-4 py-2">{t("an.profit")}</th>
              <th className="px-4 py-2">{t("an.marginPct")}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[var(--border)]">
            {[...byProduct.values()].length === 0 ? (
              <tr>
                <td colSpan={10} className="px-4 py-6 text-[var(--muted)]">
                  {t("an.noSales")}
                </td>
              </tr>
            ) : null}
          </tbody>
          {[...byProduct.values()].length > 0 ? (
            <RevealList as="tbody" moreLabel={t("home.seeAll")} lessLabel={t("home.hide")} limit={5} className="divide-y divide-[var(--border)]">
              {[...byProduct.values()].map((row) => {
                const fullCost = row.materials.add(row.labor).add(row.commission);
                const profitRow = row.revenue.sub(fullCost);
                const margin = row.revenue.gt(0) ? profitRow.div(row.revenue).mul(100) : D(0);
                const avg = row.qty.gt(0) ? row.revenue.div(row.qty) : D(0);
                return (
                  <tr key={row.name}>
                    <td className="px-4 py-2 font-medium">{row.name}</td>
                    <td className="px-4 py-2 font-mono text-xs">{qtyDisplay(row.qty)} {row.unit}</td>
                    <td className="px-4 py-2 font-mono text-xs">{moneyDisplay(row.revenue)} с</td>
                    <td className="px-4 py-2 font-mono text-xs">{moneyDisplay(avg)} с</td>
                    <td className="px-4 py-2 font-mono text-xs">{moneyDisplay(row.materials)} с</td>
                    <td className="px-4 py-2 font-mono text-xs">{moneyDisplay(row.labor)} с</td>
                    <td className="px-4 py-2 font-mono text-xs">{moneyDisplay(row.commission)} с</td>
                    <td className="px-4 py-2 font-mono text-xs">{moneyDisplay(fullCost)} с</td>
                    <td className="px-4 py-2 font-mono text-xs">{moneyDisplay(profitRow)} с</td>
                    <td className="px-4 py-2 font-mono text-xs">{margin.toFixed(1)}%</td>
                  </tr>
                );
              })}
            </RevealList>
          ) : null}
        </table>
      </section>

      {cover.purchaseNeed.length > 0 ? (
        <section className="rounded-[var(--radius-md)] border border-[var(--warning)]/40 bg-[var(--warning)]/10 p-5">
          <h2 className="text-sm font-semibold">{t("an.needBuy")}</h2>
          <RevealList moreLabel={t("home.seeAll")} lessLabel={t("home.hide")}>
            {cover.purchaseNeed.map((n) => (
              <li key={n.name}>
                {n.name}: {n.qty} {n.symbol}
              </li>
            ))}
          </RevealList>
          <Link href="/purchasing" className="mt-2 inline-block text-sm text-[var(--titan-dark)]">
            {t("page.purchasing")}
          </Link>
        </section>
      ) : null}

      <section className="ui-card">
        <h2 className="text-sm font-semibold">{t("an.inProdNow")}</h2>
        {inProd.length === 0 ? (
          <p className="mt-2 text-sm text-[var(--muted)]">{t("an.noOpenJobs")}</p>
        ) : (
          <RevealList moreLabel={t("home.seeAll")} lessLabel={t("home.hide")}>
            {inProd.map((j) => (
              <li key={j.id} className="flex items-center justify-between gap-2">
                <CustomerRef
                  name={j.order.customer.name}
                  href={`/production/${j.id}`}
                  manager={j.order.items[0]?.product.name}
                />
                <span className="text-[12px] tabular-nums text-[#2563a6]">
                  {qtyDisplay(j.producedQty)} / {qtyDisplay(j.plannedQty)}
                </span>
              </li>
            ))}
          </RevealList>
        )}
      </section>

      {overdue.length > 0 ? (
        <section className="rounded-[var(--radius-md)] border border-[var(--warning)]/40 bg-[var(--warning)]/10 p-5">
          <h2 className="text-sm font-semibold">{t("an.overdue")}</h2>
          <RevealList moreLabel={t("home.seeAll")} lessLabel={t("home.hide")}>
            {overdue.map((o) => (
              <li key={o.id} className="flex items-center justify-between gap-2">
                <div className="min-w-0">
                  <CustomerRef name={o.customer.name} href={`/orders/${o.id}`} />
                </div>
                <StatusBadge label={n("ostatus", o.status.code, o.status.name)} tone={orderTone(o.status.code)} />
              </li>
            ))}
          </RevealList>
        </section>
      ) : null}

      <section className="ui-card">
        <h2 className="text-sm font-semibold">{t("an.criticalRaw")}</h2>
        {critical.length === 0 ? (
          <p className="mt-2 text-sm text-[var(--muted)]">{t("an.noBelowMin")}</p>
        ) : (
          <RevealList moreLabel={t("home.seeAll")} lessLabel={t("home.hide")}>
            {critical.map((m) => (
              <li key={m.id} className="flex justify-between gap-2">
                <span>{m.name}</span>
                <span className="text-[12px] font-semibold text-[var(--warn)]">
                  {qtyDisplay(m.stockItems.reduce((s, i) => s.add(i.qtyOnHand), D(0)))} {m.storageUnit.symbol}
                </span>
              </li>
            ))}
          </RevealList>
        )}
        <p className="mt-2 text-xs text-[var(--muted)]">
          {t("an.rawPositions", { n: rawItems.length })}
        </p>
      </section>

      {over.length > 0 ? (
        <section className="rounded-[var(--radius-md)] border border-[var(--warning)]/40 bg-[var(--warning)]/10 p-5">
          <h2 className="text-sm font-semibold">{t("an.overuse")}</h2>
          <ul className="mt-2 space-y-1 text-sm">
            {over.slice(0, 20).map((u) => (
              <li key={u.id}>
                #{u.batch.production.order.number}: {u.material.name} {t("orders.plan")} {qtyDisplay(u.plannedQty)}, {t("prod.actual")} {qtyDisplay(u.actualQty)}
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      <section className="ui-card">
        <h2 className="text-sm font-semibold">{t("an.scrapBy")}</h2>
        <p className="mt-1 text-sm leading-snug text-[var(--text-muted)]">{t("an.scrapHint")}</p>
        <p className="mt-1 text-xs text-[var(--muted)]">{t("an.periodMonth")}</p>
        {scrapByUser.size === 0 && scrapByProduct.size === 0 ? (
          <p className="mt-2 text-sm text-[var(--muted)]">{t("an.noScrap")}</p>
        ) : (
          <div className="mt-3 space-y-3 text-sm">
            {scrapByUser.size > 0 ? (
              <div>
                <p className="text-xs font-semibold text-[#344054]">{t("an.scrapPerson")}</p>
                <ul className="mt-1 space-y-1">
                  {[...scrapByUser.entries()].map(([id, q]) => (
                    <li key={id} className="flex justify-between gap-3">
                      <span>{userName.get(id) ?? id}</span>
                      <span className="font-mono text-xs font-semibold tabular-nums">{qtyDisplay(q)} м²</span>
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}
            {scrapByProduct.size > 0 ? (
              <div>
                <p className="text-xs font-semibold text-[#344054]">{t("an.scrapProduct")}</p>
                <ul className="mt-1 space-y-1">
                  {[...scrapByProduct.entries()].map(([name, q]) => (
                    <li key={name} className="flex justify-between gap-3">
                      <span>{name}</span>
                      <span className="font-mono text-xs font-semibold tabular-nums">{qtyDisplay(q)} м²</span>
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}
          </div>
        )}
      </section>
    </div>
  );
}

