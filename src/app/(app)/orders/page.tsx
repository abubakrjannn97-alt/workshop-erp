import { getTranslator } from "@core/shared/i18n/locale";
import { prisma } from "@core/infrastructure/prisma";
import { requirePermission } from "@core/auth/authz";
import { hasPermission } from "@core/auth/authz";
import { D, moneyDisplay } from "@core/shared/decimal";
import { orderNo } from "@core/shared/format";
import {
  ORDERS_PAGE_SIZE,
  buildOrdersQuery,
  resolveOrderDateRange,
} from "@core/shared/order-period";
import {
  completedOrdersStatusWhere,
  newOrdersStatusWhere,
  orderListStatusWhere,
  resolveOrderListBucket,
  ORDER_LIST_BUCKET_DONE,
  ORDER_LIST_BUCKET_NEW,
} from "@core/shared/orders-list-filter";
import { Segmented } from "@/components/segmented";
import { OrdersMobileHeaderTools } from "./orders-mobile-header-tools";
import { OrdersPeriodPicker } from "./orders-period-picker";
import {
  OrdersEmpty,
  OrdersFilterToolbar,
  OrdersListPanel,
  OrdersPageHeader,
  OrdersSummaryStrip,
  type OrderListItem,
} from "./orders-ui";
import styles from "./orders.module.css";

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
  const { t, n } = await getTranslator();
  const session = await requirePermission("orders.view");
  const params = await searchParams;
  const { q, status, from: fromRaw, to: toRaw, page: pageRaw } = params;
  const period = params.period ?? "month";
  const activeBucket = resolveOrderListBucket(status);
  const canCreate = hasPermission(session.user.permissions, session.user.roleCode, "orders.create");
  const ownOnly = session.user.roleCode === "sales_manager";
  const page = Math.max(1, Number(pageRaw) || 1);
  const number = q && /^\d+$/.test(q.trim()) ? Number(q.trim()) : undefined;
  const { from, to, period: resolvedPeriod } = resolveOrderDateRange({
    period,
    from: fromRaw,
    to: toRaw,
  });

  const periodWhere = {
    ...(ownOnly ? { sellerId: session.user.id } : {}),
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

  const where = {
    ...periodWhere,
    ...orderListStatusWhere(status),
  };

  const [orders, total, statuses, newStats, completedStats] = await Promise.all([
    prisma.order.findMany({
      where,
      include: {
        customer: true,
        seller: true,
        status: true,
        items: { include: { product: true }, orderBy: { id: "asc" }, take: 3 },
      },
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * ORDERS_PAGE_SIZE,
      take: ORDERS_PAGE_SIZE,
    }),
    prisma.order.count({ where }),
    prisma.orderStatus.findMany({ orderBy: { sortOrder: "asc" } }),
    prisma.order.aggregate({
      where: { ...periodWhere, ...newOrdersStatusWhere() },
      _count: true,
      _sum: { total: true },
    }),
    prisma.order.aggregate({
      where: { ...periodWhere, ...completedOrdersStatusWhere() },
      _count: true,
      _sum: { total: true },
    }),
  ]);

  const totalPages = Math.max(1, Math.ceil(total / ORDERS_PAGE_SIZE));

  const baseQuery = {
    q: q?.trim() || undefined,
    status: activeBucket,
    period: resolvedPeriod === "custom" ? "custom" : resolvedPeriod,
    from: fromRaw || undefined,
    to: toRaw || undefined,
  };

  const statusLabel = (code: string, name: string) => n("ostatus", code, name);
  const productMoreLabel = (extra: number) => t("orders.productMore", { n: String(extra) });
  const listOrders = orders as OrderListItem[];

  return (
    <div className={styles.page}>
      <OrdersPageHeader
        title={t("page.orders")}
        subtitle={t("orders.manageHint")}
        historyHref="/crm/history"
        historyLabel={t("crm.purchaseHistory")}
        canCreate={canCreate}
        newOrderHref="/orders/new"
        newOrderLabel={t("sales.newOrder")}
        mobileTools={
          <OrdersMobileHeaderTools
            searchLabel={t("orders.searchLabel")}
            searchPlaceholder={t("orders.searchPh")}
            initialQ={q}
            canCreate={canCreate}
            newOrderHref="/orders/new"
            newOrderLabel={t("sales.newOrder")}
          />
        }
      />

      <OrdersSummaryStrip
        summary={{
          newCount: newStats._count,
          newRevenue: moneyDisplay(D(String(newStats._sum.total ?? 0))),
          completedCount: completedStats._count,
          completedRevenue: moneyDisplay(D(String(completedStats._sum.total ?? 0))),
        }}
        labels={{
          new: t("orders.kpiNew"),
          completed: t("orders.kpiCompleted"),
        }}
        activeBucket={activeBucket}
        newHref={buildOrdersQuery({ ...baseQuery, status: ORDER_LIST_BUCKET_NEW, page: undefined })}
        completedHref={buildOrdersQuery({ ...baseQuery, status: ORDER_LIST_BUCKET_DONE, page: undefined })}
      />

      <div className={styles.navRow}>
        <div className={styles.periodMobile}>
          <OrdersPeriodPicker
            current={resolvedPeriod}
            fromRaw={fromRaw}
            toRaw={toRaw}
            status={activeBucket}
            q={q?.trim()}
            presetLabels={{
              month: t("orders.periodMonth"),
              prev: t("orders.periodPrev"),
              all: t("orders.periodAll"),
            }}
            customLabel={t("orders.periodCustom")}
            calendarLabel={t("orders.periodCalendar")}
            fromLabel={t("orders.dateFrom")}
            toLabel={t("orders.dateTo")}
            applyLabel={t("orders.periodApply")}
          />
        </div>
        <div className={styles.periodDesktop}>
          <Segmented
            scroll
            aria-label={t("home.period")}
            items={(
              [
                ["month", t("orders.periodMonth")],
                ["prev", t("orders.periodPrev")],
                ["all", t("orders.periodAll")],
              ] as const
            ).map(([p, label]) => ({
              href: buildOrdersQuery({ ...baseQuery, period: p, page: undefined }),
              label,
              active: resolvedPeriod === p,
            }))}
          />
        </div>
      </div>

      <OrdersFilterToolbar
        searchLabel={t("orders.searchLabel")}
        searchPlaceholder={t("orders.searchPh")}
        statusLabel={t("common.status")}
        allStatusesLabel={t("orders.allStatuses")}
        statuses={statuses.map((s) => ({ code: s.code, name: n("ostatus", s.code, s.name) }))}
        statusValue={status}
        fromLabel={t("orders.dateFrom")}
        toLabel={t("orders.dateTo")}
        searchLabelBtn={t("common.search")}
        resetLabel={t("orders.filterReset")}
        filtersLabel={t("orders.filters")}
        periodValue={resolvedPeriod === "custom" ? "custom" : resolvedPeriod}
        fromValue={fromRaw}
        toValue={toRaw}
        qValue={q}
        resetHref="/orders"
      />

      {listOrders.length === 0 ? (
        <OrdersEmpty
          title={t("orders.emptyTitle")}
          description={t("orders.emptyDesc")}
          actionHref={canCreate ? "/orders/new" : undefined}
          actionLabel={canCreate ? t("sales.newOrder") : undefined}
        />
      ) : (
        <OrdersListPanel
          orders={listOrders}
          orderNo={orderNo}
          moneyDisplay={moneyDisplay}
          statusLabel={statusLabel}
          attentionLabel={t("orders.attention")}
          productMoreLabel={productMoreLabel}
          colOrder={t("home.col.order")}
          colCustomer={t("home.col.customer")}
          colProduct={t("home.col.product")}
          colStatus={t("home.col.status")}
          colAmount={t("home.col.amount")}
          pagination={{
            page,
            totalPages,
            prevHref: page > 1 ? buildOrdersQuery({ ...baseQuery, page: String(page - 1) }) : undefined,
            nextHref: page < totalPages ? buildOrdersQuery({ ...baseQuery, page: String(page + 1) }) : undefined,
            prevLabel: t("common.back"),
            nextLabel: t("common.next"),
            meta: `${page} / ${totalPages}`,
          }}
        />
      )}
    </div>
  );
}
