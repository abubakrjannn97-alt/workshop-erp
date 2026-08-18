import Link from "next/link";
import { prisma } from "@core/infrastructure/prisma";
import { requireSession } from "@core/auth/authz";
import { D, moneyDisplay } from "@core/shared/decimal";
import { periodKey, periodRange } from "@core/payroll/payroll";
import { getTranslator } from "@core/shared/i18n/locale";
import { KpiCard } from "@/components/kpi-card";
import { PageHeader } from "@/components/page-header";
import { DashPanel } from "@/components/dash-panel";
import { DashKpiGrid } from "@/components/dashboard/dashboard-system";
import { RevealList } from "@/components/reveal-list";
import {
  DataList,
  DataListEmpty,
  DataListHead,
  DataListHeadCell,
  DataListMetric,
  DataListPrimary,
  DataListRow,
  DataListCell,
  dataListStyles,
} from "@/components/data-list";

export async function SalesHome() {
  const session = await requireSession();
  const { t } = await getTranslator();
  const userId = session.user.id;
  const { start, end } = periodRange(periodKey());

  const [leads, customers, orders, commission] = await Promise.all([
    prisma.lead.findMany({
      where: { archivedAt: null, managerId: userId, stage: { isWon: false, isLost: false } },
      include: { stage: true },
      orderBy: { updatedAt: "desc" },
      take: 12,
    }),
    prisma.customer.findMany({
      where: { archivedAt: null, managerId: userId },
      orderBy: { name: "asc" },
      take: 12,
    }),
    prisma.order.findMany({
      where: { sellerId: userId, createdAt: { gte: start, lt: end }, status: { code: { not: "CANCELLED" } } },
      include: { customer: true, status: true },
      orderBy: { createdAt: "desc" },
    }),
    prisma.payrollAccrual.aggregate({
      where: { userId, kind: "COMMISSION", periodKey: periodKey(), status: "ACCRUED" },
      _sum: { amount: true },
    }),
  ]);

  const fact = orders.reduce((s, o) => s.add(String(o.total)), D(0));
  const paid = orders.reduce((s, o) => s.add(String(o.paidAmount)), D(0));
  const earned = D(String(commission._sum.amount ?? 0));

  return (
    <div className="page-stack">
      <PageHeader title={t("nav.home")} description={t("me.commissionHint")} />
      <DashKpiGrid cols="2" tour="home-kpis">
        <KpiCard href="/orders" label={t("dash.planFact")} value={`${moneyDisplay(paid)} / ${moneyDisplay(fact)} с`} hint={t("home.period")} tone="in" />
        <KpiCard href="/me/commission" label={t("me.earned")} value={`${moneyDisplay(earned)} с`} tone="in" />
        <KpiCard href="/crm" label={t("dash.myLeads")} value={String(leads.length)} tone="ink" />
        <KpiCard href="/crm" label={t("dash.myClients")} value={String(customers.length)} tone="ink" />
      </DashKpiGrid>
      <DashPanel title={t("dash.myLeads")} tour="home-work">
        {leads.length === 0 ? (
          <DataListEmpty>{t("common.empty")}</DataListEmpty>
        ) : (
          <DataList layout="cols2">
            <DataListHead layout="cols2">
              <DataListHeadCell>{t("crm.leadName")}</DataListHeadCell>
              <DataListHeadCell align="right">{t("list.col.stage")}</DataListHeadCell>
            </DataListHead>
            <RevealList moreLabel={t("home.seeAll")} lessLabel={t("home.hide")} limit={5} className={dataListStyles.rows}>
              {leads.map((l) => (
                <DataListRow key={l.id} layout="cols2">
                  <DataListPrimary title={l.name} href="/crm" />
                  <DataListCell label={t("list.col.stage")} align="right">
                    {l.stage.name}
                  </DataListCell>
                </DataListRow>
              ))}
            </RevealList>
          </DataList>
        )}
      </DashPanel>
      <DashPanel title={t("sales.recentOrders")}>
        {orders.length === 0 ? (
          <DataListEmpty>{t("crm.noOrders")}</DataListEmpty>
        ) : (
          <DataList layout="cols2">
            <DataListHead layout="cols2">
              <DataListHeadCell>{t("home.col.customer")}</DataListHeadCell>
              <DataListHeadCell align="right">{t("home.col.amount")}</DataListHeadCell>
            </DataListHead>
            <RevealList moreLabel={t("home.seeAll")} lessLabel={t("home.hide")} limit={5} className={dataListStyles.rows}>
              {orders.map((o) => (
                <DataListRow key={o.id} layout="cols2">
                  <DataListPrimary title={o.customer.name} href={`/orders/${o.id}`} />
                  <DataListMetric label={t("home.col.amount")} value={`${moneyDisplay(o.total)} с`} tone="good" />
                </DataListRow>
              ))}
            </RevealList>
          </DataList>
        )}
      </DashPanel>
    </div>
  );
}
