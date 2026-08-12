import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { requireSession } from "@/lib/authz";
import { D, moneyDisplay, qtyDisplay } from "@/lib/decimal";
import { FUND, LEDGER, fundDelta } from "@/lib/finance";
import { contributionAndNet } from "@/lib/profit";
import { coverageAndPurchaseNeed, refreshOwnerAlerts } from "@/lib/alerts";
import { getTranslator } from "@/lib/locale";

export default async function HomePage() {
  await requireSession();
  const { t } = await getTranslator();
  const monthStart = new Date();
  monthStart.setDate(1);
  monthStart.setHours(0, 0, 0, 0);

  const [
    monthOrders,
    unpaid,
    overdue,
    inProd,
    lowMaterials,
    scraps,
    accruals,
    funds,
    entries,
    purchaseOrders,
    cover,
  ] = await Promise.all([
    prisma.order.findMany({
      where: { createdAt: { gte: monthStart }, status: { code: { not: "CANCELLED" } } },
      include: { payments: true },
    }),
    prisma.order.findMany({
      where: { paymentStatus: { in: ["unpaid", "partial"] }, status: { code: { not: "CANCELLED" } } },
      include: { customer: true },
      take: 8,
    }),
    prisma.order.findMany({
      where: {
        dueAt: { lt: new Date() },
        status: { code: { notIn: ["COMPLETED", "CANCELLED", "ISSUED"] } },
      },
      include: { customer: true, status: true },
      take: 8,
    }),
    prisma.productionOrder.findMany({
      where: { status: { in: ["OPEN", "IN_PROGRESS"] } },
      include: { order: { include: { items: { include: { product: true } } } } },
      take: 8,
    }),
    prisma.material.findMany({
      where: { archivedAt: null, isActive: true },
      include: { storageUnit: true, stockItems: true },
    }),
    prisma.scrapRecord.findMany({ where: { createdAt: { gte: monthStart } } }),
    prisma.payrollAccrual.groupBy({
      by: ["kind"],
      where: { createdAt: { gte: monthStart }, status: "ACCRUED" },
      _sum: { amount: true },
    }),
    prisma.financialFund.findMany(),
    prisma.ledgerEntry.findMany({ where: { status: "POSTED" } }),
    prisma.purchaseOrder.findMany({ where: { status: { not: "CANCELLED" } } }),
    coverageAndPurchaseNeed(),
  ]);
  await refreshOwnerAlerts();

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
  const materialCost = monthOrders.reduce((s, o) => s.add(String(o.materialCost ?? 0)), D(0));
  const fixedExpenses = entries
    .filter((e) => e.type === LEDGER.CASH_OUT && e.categoryId)
    .reduce((s, e) => s.add(String(e.amount)), D(0));
  const { contribution, net } = contributionAndNet({
    revenue: sold,
    materialCost,
    labor,
    commission,
    fixedExpenses,
  });
  const scrapQty = scraps.reduce((s, r) => s.add(String(r.quantity)), D(0));
  const critical = lowMaterials.filter((m) => {
    const onHand = m.stockItems.reduce((s, i) => s.add(i.qtyOnHand), D(0));
    return onHand.lte(m.minStock);
  });

  return (
    <div className="space-y-4">
      <h1 className="page-title">{t("home.title")}</h1>

      <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
        <Stat href="/analytics" label={t("home.sold")} value={`${moneyDisplay(sold)} с`} />
        <Stat href="/sales" label={t("home.received")} value={`${moneyDisplay(received)} с`} />
        <Stat href="/sales" label={t("home.clientDebt")} value={`${moneyDisplay(clientDebt)} с`} />
        <Stat href="/purchasing" label={t("home.weOwe")} value={`${moneyDisplay(weOwe)} с`} />
        <Stat href="/analytics" label={t("home.contribution")} value={`${moneyDisplay(contribution)} с`} />
        <Stat href="/analytics" label={t("home.net")} value={`${moneyDisplay(net)} с`} />
        <Stat href="/finance" label={t("home.profitFund")} value={`${moneyDisplay(profit)} с`} />
        <Stat href="/employees" label={t("home.labor")} value={`${moneyDisplay(labor)} с`} />
        <Stat href="/employees" label={t("home.commission")} value={`${moneyDisplay(commission)} с`} />
        <Stat href="/production" label={t("home.scrap")} value={qtyDisplay(scrapQty)} />
        <Stat href="/warehouse" label={t("home.cover")} value={cover.coverQty ? `${cover.coverQty}` : "—"} />
        <Stat
          href="/purchasing"
          label={t("home.purchaseNeed")}
          value={String(cover.purchaseNeed.length)}
        />
      </div>

      <section className="ui-card p-4">
        <h2 className="section-title">{t("home.inProduction")}</h2>
        <ul className="mt-2 space-y-1 text-sm">
          {inProd.length === 0 ? (
            <li className="muted">{t("home.noJobs")}</li>
          ) : (
            inProd.map((j) => (
              <li key={j.id}>
                <Link href={`/production/${j.id}`} className="font-medium text-[var(--titan-dark)] hover:underline">
                  #{j.order.number}
                </Link>{" "}
                <span className="text-[var(--text-secondary)]">
                  {j.order.items[0]?.product.name} · {qtyDisplay(j.producedQty)} / {qtyDisplay(j.plannedQty)}
                </span>
              </li>
            ))
          )}
        </ul>
      </section>

      {overdue.length > 0 ? (
        <section className="rounded-[var(--radius-md)] border border-[var(--warning)]/40 bg-[var(--warning)]/10 p-4">
          <h2 className="section-title">{t("home.overdue")}</h2>
          <ul className="mt-2 space-y-1 text-sm">
            {overdue.map((o) => (
              <li key={o.id}>
                <Link href={`/orders/${o.id}`} className="font-medium text-[var(--titan-dark)] hover:underline">
                  #{o.number}
                </Link>{" "}
                {o.customer.name} · {o.status.name}
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {critical.length > 0 ? (
        <section className="rounded-[var(--radius-md)] border border-[var(--warning)]/40 bg-[var(--warning)]/10 p-4">
          <h2 className="section-title">{t("home.lowStock")}</h2>
          <ul className="mt-2 space-y-1 text-sm">
            {critical.map((m) => (
              <li key={m.id}>
                <Link href="/warehouse" className="hover:underline">
                  {m.name}
                </Link>
                : {qtyDisplay(m.stockItems.reduce((s, i) => s.add(i.qtyOnHand), D(0)))} {m.storageUnit.symbol}
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </div>
  );
}

function Stat({ label, value, href }: { label: string; value: string; href: string }) {
  return (
    <Link
      href={href}
      className="ui-card block p-3 transition-colors hover:border-[var(--titan)]"
    >
      <p className="text-[11px] text-[var(--muted)]">{label}</p>
      <p className="mt-1 text-lg font-semibold tabular-nums">{value}</p>
    </Link>
  );
}
