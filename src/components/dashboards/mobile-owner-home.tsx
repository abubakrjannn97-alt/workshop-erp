import { Suspense } from "react";
import { Bell, Zap, ClipboardList } from "lucide-react";
import { prisma } from "@core/infrastructure/prisma";
import { requireSession } from "@core/auth/authz";
import { D, moneyDisplay } from "@core/shared/decimal";
import { FUND, fundDelta } from "@core/finance/finance";
import { coverageAndPurchaseNeed, refreshOwnerAlerts } from "@core/inventory/alerts";
import { getTranslator, intlLocale } from "@core/shared/i18n/locale";
import { PageHeader } from "@/components/page-header";
import { KpiCard } from "@/components/kpi-card";
import { DashPanel } from "@/components/dash-panel";
import { FinancePeriodPicker } from "@/components/finance-period-picker";
import {
  buildOwnerDashAlerts,
  DashAlertList,
  DashKpiGrid,
  DashQuickActionsMobile,
  DashRecentOrders,
  DashRecentOrdersAction,
  ownerQuickActions,
} from "@/components/dashboard/dashboard-system";
import {
  financePeriodCompareHint,
  resolveFinanceDateRange,
} from "@core/shared/order-period";

function pctOf(now: { toString(): string }, prev: { toString(): string }) {
  const a = D(String(now));
  const b = D(String(prev));
  if (b.eq(0)) return a.eq(0) ? 0 : 100;
  return Number(a.sub(b).div(b).mul(100).toFixed(1));
}

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
  const prevWhere =
    range.prevFrom && range.prevTo
      ? { createdAt: { gte: range.prevFrom, lte: range.prevTo } }
      : {};

  const [periodOrders, prevOrders, unpaid, overdue, lowMaterials, funds, entries, cover, recentOrders] =
    await Promise.all([
      prisma.order.findMany({
        where: { ...periodWhere, status: { code: { not: "CANCELLED" } } },
        include: { payments: true },
      }),
      range.prevFrom
        ? prisma.order.findMany({
            where: { ...prevWhere, status: { code: { not: "CANCELLED" } } },
            include: { payments: true },
          })
        : Promise.resolve([]),
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
  const prevSold = prevOrders.reduce((s, o) => s.add(String(o.total)), D(0));
  const prevReceived = prevOrders.reduce(
    (s, o) => s.add(o.payments.reduce((p, pay) => p.add(String(pay.amount)), D(0))),
    D(0),
  );
  const clientDebt = unpaid.reduce((s, o) => s.add(D(String(o.total)).sub(o.paidAmount)), D(0));
  const profitFund = funds.find((f) => f.code === FUND.PROFIT);
  const profit = profitFund ? entries.reduce((s, e) => s.add(fundDelta(e, profitFund.id)), D(0)) : D(0);
  const profitInPeriod = profitFund
    ? entries
        .filter((e) => {
          if (range.period === "all") return true;
          if (!range.from) return true;
          const afterFrom = e.createdAt >= range.from;
          const beforeTo = range.to ? e.createdAt <= range.to : true;
          return afterFrom && beforeTo;
        })
        .reduce((s, e) => s.add(fundDelta(e, profitFund.id)), D(0))
    : D(0);
  const profitPrevPeriod = profitFund
    ? entries
        .filter((e) => {
          if (!range.prevFrom || !range.prevTo) return false;
          return e.createdAt >= range.prevFrom && e.createdAt <= range.prevTo;
        })
        .reduce((s, e) => s.add(fundDelta(e, profitFund.id)), D(0))
    : D(0);
  const debtNow = periodOrders.reduce((s, o) => {
    const due = D(String(o.total)).sub(o.paidAmount);
    return due.gt(0) ? s.add(due) : s;
  }, D(0));
  const debtPrev = prevOrders.reduce((s, o) => {
    const due = D(String(o.total)).sub(o.paidAmount);
    return due.gt(0) ? s.add(due) : s;
  }, D(0));

  const critical = lowMaterials.filter((m) => {
    const onHand = m.stockItems.reduce((s, i) => s.add(i.qtyOnHand), D(0));
    return onHand.lte(m.minStock);
  });

  const alerts = buildOwnerDashAlerts({
    t,
    overdue,
    unpaid,
    criticalMaterials: critical,
    purchaseNeedCount: cover.purchaseNeed.length,
  });

  const compareHint = financePeriodCompareHint(range.period, t);
  const hasCompare = Boolean(range.prevFrom);

  return (
    <div className="page-stack">
      <PageHeader
        title={t("home.title")}
        description={new Date().toLocaleDateString(loc, { day: "numeric", month: "long" })}
        actions={
          <Suspense fallback={<span className="text-xs text-[var(--color-text-muted)]">{t("home.periodMonth")}</span>}>
            <FinancePeriodPicker locale={locale} current={range.period} />
          </Suspense>
        }
      />

      <div data-tour="home-income">
        <KpiCard
          label={t("home.sold")}
          value={`${moneyDisplay(sold)} с`}
          hint={compareHint}
          trend={hasCompare ? pctOf(sold, prevSold) : null}
          tone="in"
        />
      </div>

      <DashPanel title={t("home.attention")} icon={Bell} tour="home-attention">
        <DashAlertList
          alerts={alerts}
          empty={t("home.noAlerts")}
          moreLabel={t("home.seeAll")}
          lessLabel={t("home.hide")}
          limit={4}
        />
      </DashPanel>

      <DashPanel title={t("home.quickActions")} icon={Zap} tour="home-shortcuts">
        <DashQuickActionsMobile actions={ownerQuickActions(t)} />
      </DashPanel>

      <DashKpiGrid cols="3" tour="home-kpis">
        <KpiCard
          label={t("home.received")}
          value={`${moneyDisplay(received)} с`}
          hint={compareHint}
          trend={hasCompare ? pctOf(received, prevReceived) : null}
          tone="in"
        />
        <KpiCard
          label={t("home.debtsShort")}
          value={`${moneyDisplay(clientDebt)} с`}
          hint={compareHint}
          trend={hasCompare ? pctOf(debtNow, debtPrev) : null}
          tone="out"
        />
        <KpiCard
          label={t("home.freeShort")}
          value={`${moneyDisplay(profit)} с`}
          hint={t("home.profitFund")}
          trend={hasCompare ? pctOf(profitInPeriod, profitPrevPeriod) : null}
          tone="in"
        />
      </DashKpiGrid>

      <DashPanel
        title={t("home.recentOrders")}
        icon={ClipboardList}
        tour="home-orders"
        action={
          <DashRecentOrdersAction href="/orders?period=all">
            {t("home.allOrders")} →
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
  );
}
