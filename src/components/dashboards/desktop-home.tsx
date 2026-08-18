import {
  Landmark,
  Bell,
  Zap,
  ClipboardList,
  Wallet,
  FileText,
} from "lucide-react";
import { prisma } from "@core/infrastructure/prisma";
import { requireSession } from "@core/auth/authz";
import { D, moneyDisplay } from "@core/shared/decimal";
import { FUND, fundDelta } from "@core/finance/finance";
import { coverageAndPurchaseNeed, refreshOwnerAlerts } from "@core/inventory/alerts";
import { getTranslator, intlLocale } from "@core/shared/i18n/locale";
import { PageHeader } from "@/components/page-header";
import { StatisticsCards } from "@/components/dashboard/StatisticsCards";
import type { StatisticsCardData, StatisticsCardTrend } from "@/components/dashboard/StatisticsCards";
import { DashPanel } from "@/components/dash-panel";
import { FundRow } from "@/components/fund-row";
import {
  buildOwnerDashAlerts,
  DashAlertList,
  DashQuickActionsDesktop,
  DashRecentOrders,
  DashRecentOrdersAction,
  ownerQuickActions,
  ownerSecondaryActions,
} from "@/components/dashboard/dashboard-system";
import {
  DataList,
  DataListHead,
  DataListHeadCell,
} from "@/components/data-table";

const CARD_ICON = { size: 13, strokeWidth: 1.7, "aria-hidden": true } as const;

function moneyCard(value: { toString(): string }) {
  const [int, frac] = D(value).toDecimalPlaces(2).toFixed(2).split(".");
  const spaced = int.replace(/\B(?=(\d{3})+(?!\d))/g, " ");
  return `${spaced}.${frac} с`;
}

function cardTrend(
  now: { toString(): string },
  prev: { toString(): string },
  label: string,
): StatisticsCardTrend {
  const a = D(String(now));
  const b = D(String(prev));

  if (b.eq(0)) {
    if (a.eq(0)) {
      return { value: "0.0%", direction: "up", label };
    }
    return { value: "100%", direction: "up", label };
  }

  const pct = Number(a.sub(b).div(b).mul(100).toFixed(1));
  return {
    value: `${Math.abs(pct).toFixed(Math.abs(pct) >= 10 ? 0 : 1)}%`,
    direction: pct >= 0 ? "up" : "down",
    label,
  };
}

function orderDebt(o: { total: unknown; paidAmount: unknown }) {
  return D(String(o.total)).sub(String(o.paidAmount));
}

export async function DesktopHome() {
  await requireSession();
  const { t, n, locale } = await getTranslator();
  const monthStart = new Date();
  monthStart.setDate(1);
  monthStart.setHours(0, 0, 0, 0);
  const prevStart = new Date(monthStart);
  prevStart.setMonth(prevStart.getMonth() - 1);

  const [
    monthOrders,
    prevOrders,
    unpaid,
    overdue,
    lowMaterials,
    funds,
    entries,
    purchaseOrders,
    cover,
    recentOrders,
  ] = await Promise.all([
    prisma.order.findMany({
      where: { createdAt: { gte: monthStart }, status: { code: { not: "CANCELLED" } } },
      include: { payments: true },
    }),
    prisma.order.findMany({
      where: {
        createdAt: { gte: prevStart, lt: monthStart },
        status: { code: { not: "CANCELLED" } },
      },
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
    prisma.purchaseOrder.findMany({ where: { status: { not: "CANCELLED" } } }),
    coverageAndPurchaseNeed(),
    prisma.order.findMany({
      include: { customer: true, status: true },
      orderBy: { createdAt: "desc" },
      take: 20,
    }),
  ]);
  await refreshOwnerAlerts();

  const sold = monthOrders.reduce((s, o) => s.add(String(o.total)), D(0));
  const received = monthOrders.reduce(
    (s, o) => s.add(o.payments.reduce((p, pay) => p.add(String(pay.amount)), D(0))),
    D(0),
  );
  const prevSold = prevOrders.reduce((s, o) => s.add(String(o.total)), D(0));
  const prevReceived = prevOrders.reduce(
    (s, o) => s.add(o.payments.reduce((p, pay) => p.add(String(pay.amount)), D(0))),
    D(0),
  );
  const clientDebt = unpaid.reduce((s, o) => s.add(D(String(o.total)).sub(o.paidAmount)), D(0));
  const weOwe = purchaseOrders.reduce((s, o) => s.add(D(String(o.total)).sub(o.paidAmount)), D(0));
  const profitFund = funds.find((f) => f.code === FUND.PROFIT);
  const profit = profitFund
    ? entries.reduce((s, e) => s.add(fundDelta(e, profitFund.id)), D(0))
    : D(0);
  const profitThisMonth = profitFund
    ? entries
        .filter((e) => e.createdAt >= monthStart)
        .reduce((s, e) => s.add(fundDelta(e, profitFund.id)), D(0))
    : D(0);
  const profitPrevMonth = profitFund
    ? entries
        .filter((e) => e.createdAt >= prevStart && e.createdAt < monthStart)
        .reduce((s, e) => s.add(fundDelta(e, profitFund.id)), D(0))
    : D(0);
  const debtFromThisMonth = monthOrders.reduce((s, o) => {
    const due = orderDebt(o);
    return due.gt(0) ? s.add(due) : s;
  }, D(0));
  const debtFromPrevMonth = prevOrders.reduce((s, o) => {
    const due = orderDebt(o);
    return due.gt(0) ? s.add(due) : s;
  }, D(0));
  const fundBalances = funds.map((f) => ({
    ...f,
    balance: entries.reduce((s, e) => s.add(fundDelta(e, f.id)), D(0)),
  }));
  const critical = lowMaterials.filter((m) => {
    const onHand = m.stockItems.reduce((s, i) => s.add(i.qtyOnHand), D(0));
    return onHand.lte(m.minStock);
  });
  const loc = intlLocale(locale);

  const alerts = buildOwnerDashAlerts({
    t,
    overdue,
    unpaid,
    criticalMaterials: critical,
    purchaseNeedCount: cover.purchaseNeed.length,
  });

  const vsPrev = t("home.vsPrev");
  const cards: StatisticsCardData[] = [
    {
      id: "sales",
      title: t("home.sold"),
      value: moneyCard(sold),
      subtitle: t("home.period"),
      accent: "gold",
      icon: <Wallet {...CARD_ICON} />,
      trend: cardTrend(sold, prevSold, vsPrev),
    },
    {
      id: "received",
      title: t("home.received"),
      value: moneyCard(received),
      subtitle: t("home.period"),
      accent: "gold",
      icon: <Wallet {...CARD_ICON} />,
      trend: cardTrend(received, prevReceived, vsPrev),
    },
    {
      id: "client-debt",
      title: t("home.clientDebt"),
      value: moneyCard(clientDebt),
      subtitle: `${t("home.weOwe")} ${moneyCard(weOwe)}`,
      accent: "red",
      icon: <FileText {...CARD_ICON} />,
      trend: cardTrend(debtFromThisMonth, debtFromPrevMonth, vsPrev),
    },
    {
      id: "withdrawable",
      title: t("home.withdrawable"),
      value: moneyCard(profit),
      subtitle: t("home.profitFund"),
      accent: "gold",
      icon: <Landmark {...CARD_ICON} />,
      trend: cardTrend(profitThisMonth, profitPrevMonth, vsPrev),
    },
  ];

  return (
    <div className="page-stack">
      <PageHeader title={t("home.title")} description={t("home.greetSub")} />
      <StatisticsCards cards={cards} />

      <div className="grid grid-cols-1 items-start gap-2 lg:grid-cols-5" data-tour="home-work">
        <DashPanel title={t("home.attention")} icon={Bell} className="lg:col-span-2" tour="home-attention">
          <DashAlertList
            alerts={alerts}
            empty={t("home.noAlerts")}
            moreLabel={t("home.seeAll")}
            lessLabel={t("home.hide")}
          />
        </DashPanel>

        <DashPanel title={t("home.quickActions")} icon={Zap} className="lg:col-span-3" tour="home-shortcuts">
          <DashQuickActionsDesktop
            primary={ownerQuickActions(t)}
            secondary={ownerSecondaryActions(t)}
          />
        </DashPanel>
      </div>

      <div className="grid grid-cols-1 items-start gap-2 lg:grid-cols-5">
        <DashPanel title={t("home.funds")} icon={Landmark} className="lg:col-span-2">
          <DataList layout="cols2">
            <DataListHead layout="cols2">
              <DataListHeadCell>{t("home.col.fund")}</DataListHeadCell>
              <DataListHeadCell align="right">{t("home.col.balance")}</DataListHeadCell>
            </DataListHead>
            <ul className="ui-list ui-fund-list">
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
          </DataList>
        </DashPanel>

        <DashPanel
          title={t("home.recentOrders")}
          icon={ClipboardList}
          className="lg:col-span-3"
          tour="home-orders"
          action={
            <DashRecentOrdersAction href="/orders?period=month">
              {t("page.orders")} →
            </DashRecentOrdersAction>
          }
        >
          <DashRecentOrders
            orders={recentOrders}
            empty={t("crm.noOrders")}
            moreLabel={t("home.seeAll")}
            lessLabel={t("home.hide")}
            t={t}
            n={n}
            locale={loc}
          />
        </DashPanel>
      </div>
    </div>
  );
}
