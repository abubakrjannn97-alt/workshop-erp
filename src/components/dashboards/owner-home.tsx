import {
  Landmark,
  Bell,
  Zap,
  ClipboardList,
} from "lucide-react";
import { prisma } from "@core/infrastructure/prisma";
import { D, moneyDisplay, qtyDisplay } from "@core/shared/decimal";
import { FUND, fundDelta, LEDGER } from "@core/finance/finance";
import { coverageAndPurchaseNeed, refreshOwnerAlerts } from "@core/inventory/alerts";
import { getDomainConfig } from "@core/config/domain-config";
import { getTranslator, intlLocale } from "@core/shared/i18n/locale";
import { KpiCard } from "@/components/kpi-card";
import { DashPanel } from "@/components/dash-panel";
import { FundRow } from "@/components/fund-row";
import {
  buildOwnerDashAlerts,
  DashAlertList,
  DashKpiGrid,
  DashQuickActionsDesktop,
  DashRecentOrders,
  ownerQuickActions,
  ownerSecondaryActions,
} from "@/components/dashboard/dashboard-system";

function monthStart() {
  const d = new Date();
  d.setDate(1);
  d.setHours(0, 0, 0, 0);
  return d;
}

export async function OwnerHome() {
  const { t, n, locale } = await getTranslator();
  const start = monthStart();
  const domainConfig = await getDomainConfig();
  const outputUnit = await prisma.unit.findUnique({
    where: { code: domainConfig.product.defaultOutputUnit },
  });
  const outputUnitSymbol = outputUnit?.symbol ?? t("common.unitGeneric");

  const [
    unpaid,
    overdue,
    lowMaterials,
    funds,
    entries,
    cover,
    recentOrders,
    monthOrders,
    monthPays,
    monthProd,
  ] = await Promise.all([
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
      take: 20,
    }),
    prisma.order.findMany({
      where: { createdAt: { gte: start }, status: { code: { not: "CANCELLED" } } },
      select: { total: true },
    }),
    prisma.payment.aggregate({ where: { createdAt: { gte: start } }, _sum: { amount: true } }),
    prisma.productionBatch.aggregate({
      where: { status: "CLOSED", producedAt: { gte: start } },
      _sum: { actualQty: true },
    }),
  ]);
  await refreshOwnerAlerts();

  const fundBalances = funds.map((f) => ({
    ...f,
    balance: entries.reduce((s, e) => s.add(fundDelta(e, f.id)), D(0)),
  }));
  const sold = monthOrders.reduce((s, o) => s.add(String(o.total)), D(0));
  const paid = D(String(monthPays._sum.amount ?? 0));
  const produced = D(String(monthProd._sum.actualQty ?? 0));
  const expenses = entries
    .filter((e) => e.type === LEDGER.CASH_OUT && e.createdAt >= start)
    .reduce((s, e) => s.add(String(e.amount)), D(0));
  const profit = fundBalances.find((f) => f.code === FUND.PROFIT)?.balance ?? D(0);

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

  return (
    <div className="page-stack">
      <DashPanel title={t("home.attention")} icon={Bell} tour="home-attention">
        <DashAlertList
          alerts={alerts}
          empty={t("home.noAlerts")}
          moreLabel={t("home.seeAll")}
          lessLabel={t("home.hide")}
        />
      </DashPanel>

      <DashKpiGrid cols="5" tour="home-income">
        <KpiCard href="/sales" label={t("dash.todaySales")} value={`${moneyDisplay(sold)} с`} hint={t("home.period")} tone="in" />
        <KpiCard href="/sales" label={t("dash.todayPaid")} value={`${moneyDisplay(paid)} с`} hint={t("home.period")} tone="in" />
        <KpiCard href="/production" label={t("dash.todayProd")} value={`${qtyDisplay(produced)} ${outputUnitSymbol}`} hint={t("home.period")} tone="ink" />
        <KpiCard href="/finance/expenses" label={t("dash.todayExp")} value={`${moneyDisplay(expenses)} с`} hint={t("home.period")} tone="out" />
        <KpiCard href="/finance" label={t("dash.todayProfit")} value={`${moneyDisplay(profit)} с`} tone="in" />
      </DashKpiGrid>

      <div className="grid grid-cols-1 items-start gap-2 lg:grid-cols-5">
        <DashPanel title={t("home.funds")} icon={Landmark} className="lg:col-span-3">
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
        </DashPanel>

        <DashPanel title={t("home.quickActions")} icon={Zap} className="lg:col-span-2" tour="home-shortcuts">
          <DashQuickActionsDesktop primary={ownerQuickActions(t)} secondary={ownerSecondaryActions(t)} />
        </DashPanel>
      </div>

      <DashPanel title={t("home.recentOrders")} icon={ClipboardList} tour="home-orders">
        <DashRecentOrders
          orders={recentOrders}
          empty={t("crm.noOrders")}
          moreLabel={t("home.seeAll")}
          lessLabel={t("home.hide")}
          t={t}
          n={n}
          locale={loc}
          variant="customer"
        />
      </DashPanel>
    </div>
  );
}
