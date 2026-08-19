import { ClipboardList, Wallet, AlertTriangle, TrendingUp } from "lucide-react";
import { prisma } from "@core/infrastructure/prisma";
import { requireSession } from "@core/auth/authz";
import { D, moneyDisplay } from "@core/shared/decimal";
import { FUND, fundDelta } from "@core/finance/finance";
import { coverageAndPurchaseNeed, refreshOwnerAlerts } from "@core/inventory/alerts";
import { getTranslator, intlLocale } from "@core/shared/i18n/locale";
import {
  countOwnerAttention,
  DashAttentionCounts,
  DashGreeting,
  DashMetricStrip,
  DashQuickActions,
  DashRecentOrders,
  DashRecentOrdersAction,
  DashSection,
  ownerDesktopQuickActions,
} from "@/components/dashboard/dashboard-system";
import { resolveFinanceDateRange } from "@core/shared/order-period";
import styles from "@/components/dashboard/dash-home.module.css";

export async function MobileOwnerHome({ financePeriod }: { financePeriod?: string }) {
  await requireSession();
  const { t, n, locale } = await getTranslator();
  const range = resolveFinanceDateRange(financePeriod);
  const loc = intlLocale(locale);

  const periodWhere =
    range.from && range.to
      ? { createdAt: { gte: range.from, lte: range.to } }
      : range.from
        ? { createdAt: { gte: range.from } }
        : {};

  const [periodOrders, unpaid, overdue, lowMaterials, funds, entries, cover, recentOrders] = await Promise.all([
    prisma.order.findMany({
      where: { ...periodWhere, status: { code: { not: "CANCELLED" } } },
      include: { payments: true },
    }),
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
    prisma.financialFund.findMany({ orderBy: { sortOrder: "asc" } }),
    prisma.ledgerEntry.findMany({ where: { status: "POSTED" }, orderBy: { createdAt: "desc" } }),
    coverageAndPurchaseNeed(),
    prisma.order.findMany({
      include: { customer: true, status: true },
      orderBy: { createdAt: "desc" },
      take: 5,
    }),
  ]);
  await refreshOwnerAlerts();

  const sold = periodOrders.reduce((s, o) => s.add(String(o.total)), D(0));
  const received = periodOrders.reduce(
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
  const attentionCount = countOwnerAttention({
    overdueCount: overdue.length,
    unpaidCount: unpaidDue.length,
    criticalCount: critical.length,
    purchaseNeedCount: cover.purchaseNeed.length,
  });
  const profitFund = fundBalances.find((f) => f.code === FUND.PROFIT);

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
      <DashGreeting t={t} />

      <DashMetricStrip
        tour="home-income"
        metrics={[
          {
            id: "sales",
            tone: "orange",
            icon: ClipboardList,
            label: t("home.sold"),
            value: `${moneyDisplay(sold)} с`,
            hint: t("home.period"),
          },
          {
            id: "inflow",
            tone: "green",
            icon: Wallet,
            label: t("home.inflow"),
            value: `${moneyDisplay(received)} с`,
            hint: t("home.heroReceived"),
          },
          {
            id: "attention",
            tone: "blue",
            icon: AlertTriangle,
            label: t("home.attention"),
            value: String(attentionCount),
          },
          {
            id: "profit",
            tone: "purple",
            icon: TrendingUp,
            label: n("fund", FUND.PROFIT, "Прибыль"),
            value: `${moneyDisplay(profitFund?.balance ?? D(0))} с`,
          },
        ]}
      />

      {attn.length > 0 ? (
        <DashSection title={t("home.attention")} tour="home-attention">
          <DashAttentionCounts rows={attn} empty={t("home.noAlerts")} />
        </DashSection>
      ) : null}

      <DashSection title={t("home.quickActions")} tour="home-shortcuts" flush>
        <DashQuickActions actions={ownerDesktopQuickActions(t)} layout="mobile" />
      </DashSection>

      <DashSection
        title={t("home.ordersToday")}
        tour="home-orders"
        action={<DashRecentOrdersAction href="/orders?period=month">{t("home.allOrders")}</DashRecentOrdersAction>}
      >
        <DashRecentOrders orders={recentOrders} empty={t("crm.noOrders")} n={n} locale={loc} layout="list" />
      </DashSection>
    </div>
  );
}
