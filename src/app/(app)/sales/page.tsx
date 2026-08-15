import { getTranslator } from "@/lib/locale";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/authz";
import { hasPermission } from "@/lib/authz";
import { D, moneyDisplay } from "@/lib/decimal";
import { intlLocale } from "@/lib/i18n";
import { KpiCard } from "@/components/kpi-card";
import { RevealList } from "@/components/reveal-list";
import { StatusBadge, orderTone, payTone } from "@/components/status-badge";
import { PageHeader } from "@/components/page-header";
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

export default async function SalesPage() {
  const { t, locale, n } = await getTranslator();
  const session = await requirePermission("orders.view");
  const canCreate = hasPermission(session.user.permissions, session.user.roleCode, "orders.create");
  const own = session.user.roleCode === "sales_manager" ? { sellerId: session.user.id } : {};
  const crmOwn = session.user.roleCode === "sales_manager" ? { managerId: session.user.id } : {};

  const [orders, unpaid, overdue, leads] = await Promise.all([
    prisma.order.findMany({
      where: own,
      include: { customer: true, status: true },
      orderBy: { createdAt: "desc" },
      take: 20,
    }),
    prisma.order.findMany({
      where: { ...own, paymentStatus: { in: ["unpaid", "partial"] }, status: { code: { not: "CANCELLED" } } },
      include: { customer: true },
      orderBy: { createdAt: "desc" },
      take: 20,
    }),
    prisma.order.findMany({
      where: {
        ...own,
        dueAt: { lt: new Date() },
        status: { code: { notIn: ["COMPLETED", "CANCELLED", "ISSUED"] } },
      },
      include: { customer: true, status: true },
      take: 20,
    }),
    prisma.lead.count({ where: { archivedAt: null, ...crmOwn, stage: { isWon: false, isLost: false } } }),
  ]);

  const monthStart = new Date();
  monthStart.setDate(1);
  monthStart.setHours(0, 0, 0, 0);
  const monthOrders = await prisma.order.findMany({
    where: { ...own, createdAt: { gte: monthStart }, status: { code: { not: "CANCELLED" } } },
  });
  const monthTotal = monthOrders.reduce((s, o) => s.add(String(o.total)), D(0));

  return (
    <div className="page-stack">
      <PageHeader
        title={t("page.sales")}
        description={t("page.salesHint")}
        actions={<>{canCreate ? (
          <Link href="/orders/new" className="ui-btn-primary" data-tour="sales-new">
            {t("sales.newOrder")}
          </Link>
        ) : null}</>}
      />
      <div className="grid gap-3 sm:grid-cols-3">
        <KpiCard label={t("sales.monthTotal")} value={`${moneyDisplay(monthTotal)} с`} hint={t("home.period")} tone="in" />
        <KpiCard label={t("sales.unpaid")} value={String(unpaid.length)} hint={t("sales.unpaidHint")} tone="out" />
        <KpiCard label={t("sales.leadsOpen")} value={String(leads)} hint={t("sales.leadsHint")} tone="ink" />
      </div>

      {overdue.length > 0 ? (
        <section className="ui-card overflow-hidden">
          <h2 className="section-title">{t("sales.overdueOrders")}</h2>
          <DataList layout="cols2">
            <DataListHead layout="cols2">
              <DataListHeadCell>{t("home.col.customer")}</DataListHeadCell>
              <DataListHeadCell align="right">{t("home.col.status")}</DataListHeadCell>
            </DataListHead>
            <RevealList moreLabel={t("home.seeAll")} lessLabel={t("home.hide")} className={dataListStyles.rows}>
              {overdue.map((o) => (
                <DataListRow key={o.id} layout="cols2">
                  <DataListPrimary
                    title={o.customer.name}
                    href={`/orders/${o.id}`}
                    subtitle={
                      o.dueAt
                        ? `${t("common.until")} ${o.dueAt.toLocaleDateString(intlLocale(locale))}`
                        : undefined
                    }
                  />
                  <DataListCell label={t("home.col.status")} align="right">
                    <StatusBadge label={n("ostatus", o.status.code, o.status.name)} tone={orderTone(o.status.code)} />
                  </DataListCell>
                </DataListRow>
              ))}
            </RevealList>
          </DataList>
        </section>
      ) : null}

      <section className="ui-card overflow-hidden" data-tour="sales-debts">
        <h2 className="section-title">{t("sales.clientDebts")}</h2>
        {unpaid.length === 0 ? (
          <DataListEmpty>{t("sales.noDebts")}</DataListEmpty>
        ) : (
          <DataList layout="cols3">
            <DataListHead layout="cols3">
              <DataListHeadCell>{t("home.col.customer")}</DataListHeadCell>
              <DataListHeadCell align="right">{t("common.debt")}</DataListHeadCell>
              <DataListHeadCell align="right">{t("home.col.status")}</DataListHeadCell>
            </DataListHead>
            <RevealList moreLabel={t("home.seeAll")} lessLabel={t("home.hide")} className={dataListStyles.rows}>
              {unpaid.map((o) => (
                <DataListRow key={o.id} layout="cols3">
                  <DataListPrimary title={o.customer.name} href={`/orders/${o.id}`} />
                  <DataListMetric
                    label={t("common.debt")}
                    value={`${moneyDisplay(D(String(o.total)).sub(o.paidAmount))} с`}
                    tone="bad"
                  />
                  <DataListCell label={t("home.col.status")} align="right">
                    <StatusBadge label={t(`pay.${o.paymentStatus}`)} tone={payTone(o.paymentStatus)} />
                  </DataListCell>
                </DataListRow>
              ))}
            </RevealList>
          </DataList>
        )}
      </section>

      <section className="ui-card overflow-hidden">
        <h2 className="section-title">{t("sales.recentOrders")}</h2>
        {orders.length === 0 ? (
          <DataListEmpty>{t("crm.noOrders")}</DataListEmpty>
        ) : (
          <DataList layout="cols3">
            <DataListHead layout="cols3">
              <DataListHeadCell>{t("home.col.customer")}</DataListHeadCell>
              <DataListHeadCell align="right">{t("home.col.amount")}</DataListHeadCell>
              <DataListHeadCell align="right">{t("home.col.status")}</DataListHeadCell>
            </DataListHead>
            <RevealList moreLabel={t("home.seeAll")} lessLabel={t("home.hide")} className={dataListStyles.rows}>
              {orders.map((o) => (
                <DataListRow key={o.id} layout="cols3">
                  <DataListPrimary title={o.customer.name} href={`/orders/${o.id}`} />
                  <DataListMetric label={t("home.col.amount")} value={`${moneyDisplay(o.total)} с`} />
                  <DataListCell label={t("home.col.status")} align="right">
                    <StatusBadge label={n("ostatus", o.status.code, o.status.name)} tone={orderTone(o.status.code)} />
                  </DataListCell>
                </DataListRow>
              ))}
            </RevealList>
          </DataList>
        )}
      </section>
    </div>
  );
}
