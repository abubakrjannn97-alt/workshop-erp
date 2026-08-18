import { getTranslator, intlLocale } from "@/lib/locale";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/authz";
import { hasPermission } from "@/lib/authz";
import { D, moneyDisplay } from "@core/shared/decimal";
import { orderNo } from "@core/shared/format";
import {
  ORDERS_PAGE_SIZE,
  buildOrdersQuery,
  orderPeriodLabel,
  resolveOrderDateRange,
} from "@core/shared/order-period";
import { PageHeader } from "@/components/page-header";
import { KpiCard } from "@/components/kpi-card";
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
import { StatusBadge, orderTone } from "@/components/status-badge";

export default async function OrdersPage({
  searchParams,
}: {
  searchParams: Promise<{
    q?: string;
    status?: string;
    period?: string;
    from?: string;
    to?: string;
    page?: string;
  }>;
}) {
  const { t, locale, n } = await getTranslator();
  const session = await requirePermission("orders.view");
  const params = await searchParams;
  const { q, status, from: fromRaw, to: toRaw, page: pageRaw } = params;
  const period = params.period ?? "month";
  const canCreate = hasPermission(session.user.permissions, session.user.roleCode, "orders.create");
  const ownOnly = session.user.roleCode === "sales_manager";
  const page = Math.max(1, Number(pageRaw) || 1);
  const number = q && /^\d+$/.test(q.trim()) ? Number(q.trim()) : undefined;
  const { from, to, period: resolvedPeriod } = resolveOrderDateRange({
    period,
    from: fromRaw,
    to: toRaw,
  });

  const where = {
    ...(ownOnly ? { sellerId: session.user.id } : {}),
    ...(status ? { status: { code: status } } : {}),
    ...(from || to
      ? {
          createdAt: {
            ...(from ? { gte: from } : {}),
            ...(to ? { lte: to } : {}),
          },
        }
      : {}),
    ...(number
      ? { number }
      : q?.trim()
        ? { customer: { name: { contains: q.trim(), mode: "insensitive" as const } } }
        : {}),
  };

  const [orders, total, statuses, agg] = await Promise.all([
    prisma.order.findMany({
      where,
      include: { customer: true, seller: true, status: true },
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * ORDERS_PAGE_SIZE,
      take: ORDERS_PAGE_SIZE,
    }),
    prisma.order.count({ where }),
    prisma.orderStatus.findMany({ orderBy: { sortOrder: "asc" } }),
    prisma.order.aggregate({ where, _sum: { total: true } }),
  ]);

  const totalSum = D(String(agg._sum.total ?? 0));
  const totalPages = Math.max(1, Math.ceil(total / ORDERS_PAGE_SIZE));
  const loc = intlLocale(locale);
  const periodLabel = orderPeriodLabel(resolvedPeriod, t, from, to);

  const baseQuery = {
    q: q?.trim() || undefined,
    status: status || undefined,
    period: resolvedPeriod === "custom" ? "custom" : resolvedPeriod,
    from: fromRaw || undefined,
    to: toRaw || undefined,
  };

  return (
    <div className="page-stack">
      <PageHeader
        title={t("page.orders")}
        description={t("orders.registryHint")}
        actions={
          <>
            <Link href="/crm/history" className="ui-btn-secondary">
              {t("crm.purchaseHistory")}
            </Link>
            {canCreate ? (
              <Link href="/orders/new" className="ui-btn-primary" data-tour="orders-new">
                {t("sales.newOrder")}
              </Link>
            ) : null}
          </>
        }
      />

      <div className="flex flex-wrap gap-2">
        {(
          [
            ["month", t("orders.periodMonth")],
            ["prev", t("orders.periodPrev")],
            ["all", t("orders.periodAll")],
          ] as const
        ).map(([p, label]) => (
          <Link
            key={p}
            href={buildOrdersQuery({ ...baseQuery, period: p, page: undefined })}
            className={resolvedPeriod === p ? "ui-chip-on" : "ui-chip"}
          >
            {label}
          </Link>
        ))}
      </div>

      <form className="ui-card flex flex-wrap items-end gap-2 p-3" data-tour="orders-search">
        <input type="hidden" name="period" value={resolvedPeriod === "custom" ? "custom" : resolvedPeriod} />
        <label className="min-w-[8rem] flex-1 text-sm">
          <span className="ui-label">{t("orders.searchPh")}</span>
          <input
            name="q"
            defaultValue={q ?? ""}
            placeholder={t("orders.searchPh")}
            className="ui-input mt-1 w-full"
          />
        </label>
        <label className="text-sm">
          <span className="ui-label">{t("common.status")}</span>
          <select name="status" defaultValue={status ?? ""} className="ui-input mt-1 min-w-[10rem]">
            <option value="">{t("orders.allStatuses")}</option>
            {statuses.map((s) => (
              <option key={s.id} value={s.code}>
                {n("ostatus", s.code, s.name)}
              </option>
            ))}
          </select>
        </label>
        <label className="text-sm">
          <span className="ui-label">{t("orders.dateFrom")}</span>
          <input type="date" name="from" defaultValue={fromRaw ?? ""} className="ui-input mt-1" />
        </label>
        <label className="text-sm">
          <span className="ui-label">{t("orders.dateTo")}</span>
          <input type="date" name="to" defaultValue={toRaw ?? ""} className="ui-input mt-1" />
        </label>
        <button type="submit" name="period" value="custom" className="ui-btn-secondary">
          {t("common.search")}
        </button>
      </form>

      <div className="grid gap-2 sm:grid-cols-3">
        <KpiCard label={t("orders.found")} value={String(total)} hint={periodLabel} tone="ink" />
        <KpiCard label={t("orders.totalSum")} value={`${moneyDisplay(totalSum)} с`} hint={periodLabel} tone="in" />
        <KpiCard
          label={t("orders.pageOf")}
          value={`${page} / ${totalPages}`}
          hint={t("orders.perPage", { n: String(ORDERS_PAGE_SIZE) })}
          tone="ink"
        />
      </div>

      <section className="overflow-hidden ui-card" data-tour="orders-list">
        {orders.length === 0 ? (
          <DataListEmpty>{t("orders.empty")}</DataListEmpty>
        ) : (
          <DataList layout="colsOrders">
            <DataListHead layout="colsOrders">
              <DataListHeadCell>{t("home.col.order")}</DataListHeadCell>
              <DataListHeadCell>{t("home.col.customer")}</DataListHeadCell>
              <DataListHeadCell align="right">{t("home.col.amount")}</DataListHeadCell>
              <DataListHeadCell align="right">{t("home.col.status")}</DataListHeadCell>
            </DataListHead>
            <ul className={dataListStyles.rows}>
              {orders.map((o) => {
                const debt = D(String(o.total)).sub(o.paidAmount);
                return (
                  <DataListRow key={o.id} layout="colsOrders">
                    <DataListPrimary
                      title={orderNo(o.number)}
                      subtitle={o.createdAt.toLocaleDateString(loc)}
                      href={`/orders/${o.id}`}
                    />
                    <DataListPrimary
                      title={o.customer.name}
                      subtitle={
                        debt.gt(0)
                          ? `${t("common.debt")}: ${moneyDisplay(debt)} с · ${t(`pay.${o.paymentStatus}`)}`
                          : t(`pay.${o.paymentStatus}`)
                      }
                      href={`/crm/customers/${o.customerId}`}
                    />
                    <DataListMetric label={t("home.col.amount")} value={`${moneyDisplay(o.total)} с`} />
                    <DataListCell label={t("home.col.status")} align="right">
                      <StatusBadge
                        label={n("ostatus", o.status.code, o.status.name)}
                        tone={orderTone(o.status.code)}
                      />
                    </DataListCell>
                  </DataListRow>
                );
              })}
            </ul>
          </DataList>
        )}

        {totalPages > 1 ? (
          <div className="flex items-center justify-between gap-2 border-t border-[var(--border-soft)] px-3 py-2">
            {page > 1 ? (
              <Link
                href={buildOrdersQuery({ ...baseQuery, page: String(page - 1) })}
                className="ui-btn-secondary"
              >
                ← {t("common.back")}
              </Link>
            ) : (
              <span />
            )}
            <span className="text-[12px] text-[var(--muted)]">
              {page} / {totalPages}
            </span>
            {page < totalPages ? (
              <Link
                href={buildOrdersQuery({ ...baseQuery, page: String(page + 1) })}
                className="ui-btn-secondary"
              >
                {t("common.next")} →
              </Link>
            ) : (
              <span />
            )}
          </div>
        ) : null}
      </section>
    </div>
  );
}
