import { prisma } from "@core/infrastructure/prisma";
import { D, moneyDisplay } from "@core/shared/decimal";
import { FUND, fundDelta } from "@core/finance/finance";
import { coverageAndPurchaseNeed, refreshOwnerAlerts } from "@core/inventory/alerts";
import { getTranslator, intlLocale } from "@core/shared/i18n/locale";
import { FundRow } from "@/components/fund-row";
import {
  countOwnerAttention,
  DashAttentionCounts,
  DashMetricStrip,
  DashQuickActions,
  DashRecentOrders,
  DashSection,
  ownerQuickActions,
} from "@/components/dashboard/dashboard-system";
import styles from "@/components/dashboard/dash-home.module.css";

function monthStart() {
  const d = new Date();
  d.setDate(1);
  d.setHours(0, 0, 0, 0);
  return d;
}

export async function OwnerHome() {
  const { t, n, locale } = await getTranslator();
  const start = monthStart();

  const [unpaid, overdue, lowMaterials, cover, recentOrders, monthOrders, funds, entries] = await Promise.all([
    prisma.order.findMany({
      where: { paymentStatus: { in: ["unpaid", "partial"] }, status: { code: { not: "CANCELLED" } } },
      include: { customer: true },
      take: 20,
    }),
    prisma.order.findMany({
      where: {
        dueAt: { lt: new Date() },
        status: { code: { notIn: ["COMPLETED", "CANCELLED", "ISSUED"] } },
      },
      include: { customer: true, status: true },
      take: 8,
    }),
    prisma.material.findMany({
      where: { archivedAt: null, isActive: true },
      include: { storageUnit: true, stockItems: true },
    }),
    coverageAndPurchaseNeed(),
    prisma.order.findMany({
      include: { customer: true, status: true },
      orderBy: { createdAt: "desc" },
      take: 5,
    }),
    prisma.order.findMany({
      where: { createdAt: { gte: start }, status: { code: { not: "CANCELLED" } } },
      include: { payments: true },
    }),
    prisma.financialFund.findMany({ orderBy: { sortOrder: "asc" } }),
    prisma.ledgerEntry.findMany({ where: { status: "POSTED" }, orderBy: { createdAt: "desc" } }),
  ]);
  await refreshOwnerAlerts();

  const sold = monthOrders.reduce((s, o) => s.add(String(o.total)), D(0));
  const received = monthOrders.reduce(
    (s, o) => s.add(o.payments.reduce((p, pay) => p.add(String(pay.amount)), D(0))),
    D(0),
  );
  const unpaidDue = unpaid.filter((row) => D(String(row.total)).sub(String(row.paidAmount)).gt(0));
  const critical = lowMaterials.filter((m) => {
    const onHand = m.stockItems.reduce((s, i) => s.add(i.qtyOnHand), D(0));
    return onHand.lte(m.minStock);
  });
  const fundBalances = funds.map((f) => ({
    ...f,
    balance: entries.reduce((s, e) => s.add(fundDelta(e, f.id)), D(0)),
  }));
  const loc = intlLocale(locale);
  const attentionCount = countOwnerAttention({
    overdueCount: overdue.length,
    unpaidCount: unpaidDue.length,
    criticalCount: critical.length,
    purchaseNeedCount: cover.purchaseNeed.length,
  });

  const attn = [
    overdue.length > 0
      ? { href: "/orders", count: overdue.length, label: t("home.attnOrdersLabel"), kind: "orders" as const }
      : null,
    unpaidDue.length > 0
      ? { href: "/orders", count: unpaidDue.length, label: t("home.attnPayLabel"), kind: "pay" as const }
      : null,
    critical.length > 0
      ? { href: "/warehouse", count: critical.length, label: t("home.attnStockLabel"), kind: "stock" as const }
      : null,
    cover.purchaseNeed.length > 0
      ? { href: "/purchasing", count: cover.purchaseNeed.length, label: t("home.attnBuyLabel"), kind: "buy" as const }
      : null,
  ].filter((row): row is NonNullable<typeof row> => row !== null);

  return (
    <div className={styles.home}>
      <DashMetricStrip
        tour="home-income"
        metrics={[
          { id: "sales", label: t("home.sold"), value: `${moneyDisplay(sold)} с`, hint: t("home.period") },
          { id: "inflow", label: t("home.inflow"), value: `${moneyDisplay(received)} с`, hint: t("home.heroReceived") },
          { id: "attention", label: t("home.attention"), value: String(attentionCount) },
        ]}
      />

      <DashSection title={t("home.attention")} tour="home-attention">
        <DashAttentionCounts rows={attn} empty={t("home.noAlerts")} />
      </DashSection>

      <DashSection title={t("home.quickActions")} tour="home-shortcuts">
        <DashQuickActions actions={ownerQuickActions(t)} />
      </DashSection>

      <DashSection title={t("home.recentOrders")} tour="home-orders">
        <DashRecentOrders orders={recentOrders} empty={t("crm.noOrders")} n={n} locale={loc} />
      </DashSection>

      <DashSection title={t("home.funds")}>
        <ul className={styles.list}>
          {fundBalances.map((f) => (
            <FundRow
              key={f.id}
              code={f.code}
              label={n("fund", f.code, f.name)}
              amount={`${moneyDisplay(f.balance)} с`}
              highlight={f.code === FUND.PROFIT}
            />
          ))}
        </ul>
      </DashSection>
    </div>
  );
}
