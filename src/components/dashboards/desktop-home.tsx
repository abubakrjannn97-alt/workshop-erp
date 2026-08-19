import { ClipboardList, Wallet, AlertTriangle, TrendingUp } from "lucide-react";
import { prisma } from "@core/infrastructure/prisma";
import { requireSession } from "@core/auth/authz";
import { D, moneyDisplay } from "@core/shared/decimal";
import { FUND, fundDelta } from "@core/finance/finance";
import { coverageAndPurchaseNeed, refreshOwnerAlerts } from "@core/inventory/alerts";
import { getTranslator, intlLocale } from "@core/shared/i18n/locale";
import {
  countOwnerAttention,
  DashGreeting,
  DashMetricStrip,
  DashQuickActions,
  DashRecentOrders,
  DashRecentOrdersFooterLink,
  DashSection,
  ownerDesktopQuickActions,
} from "@/components/dashboard/dashboard-system";
import styles from "@/components/dashboard/dash-home.module.css";

export async function DesktopHome() {
  await requireSession();
  const { t, n, locale } = await getTranslator();
  const monthStart = new Date();
  monthStart.setDate(1);
  monthStart.setHours(0, 0, 0, 0);

  const [monthOrders, unpaid, overdue, lowMaterials, funds, entries, cover, recentOrders] = await Promise.all([
    prisma.order.findMany({
      where: { createdAt: { gte: monthStart }, status: { code: { not: "CANCELLED" } } },
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
      take: 20,
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

  const sold = monthOrders.reduce((s, o) => s.add(String(o.total)), D(0));
  const received = monthOrders.reduce(
    (s, o) => s.add(o.payments.reduce((p, pay) => p.add(String(pay.amount)), D(0))),
    D(0),
  );
  const unpaidDue = unpaid.filter((row) => D(String(row.total)).sub(String(row.paidAmount)).gt(0));
  const fundBalances = funds.map((f) => ({
    ...f,
    balance: entries.reduce((s, e) => s.add(fundDelta(e, f.id)), D(0)),
  }));
  const critical = lowMaterials.filter((m) => {
    const onHand = m.stockItems.reduce((s, i) => s.add(i.qtyOnHand), D(0));
    return onHand.lte(m.minStock);
  });
  const loc = intlLocale(locale);
  const attentionCount = countOwnerAttention({
    overdueCount: overdue.length,
    unpaidCount: unpaidDue.length,
    criticalCount: critical.length,
    purchaseNeedCount: cover.purchaseNeed.length,
  });
  const profitFund = fundBalances.find((f) => f.code === FUND.PROFIT);

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
            hint: t("home.open"),
          },
          {
            id: "profit",
            tone: "purple",
            icon: TrendingUp,
            label: n("fund", FUND.PROFIT, "Прибыль"),
            value: `${moneyDisplay(profitFund?.balance ?? D(0))} с`,
            hint: t("home.funds"),
          },
        ]}
      />

      <DashSection title={t("home.quickActions")} tour="home-shortcuts" flush>
        <DashQuickActions actions={ownerDesktopQuickActions(t)} layout="desktop" />
      </DashSection>

      <DashSection
        title={t("home.recentOrders")}
        tour="home-orders"
        footer={<DashRecentOrdersFooterLink href="/orders?period=month">{t("home.viewAllOrders")}</DashRecentOrdersFooterLink>}
      >
        <DashRecentOrders orders={recentOrders} empty={t("crm.noOrders")} n={n} locale={loc} layout="table" />
      </DashSection>
    </div>
  );
}
