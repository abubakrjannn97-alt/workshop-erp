import { getTranslator } from "@core/shared/i18n/locale";
import { prisma } from "@core/infrastructure/prisma";
import { requirePermission } from "@core/auth/authz";
import { hasPermission } from "@core/auth/authz";
import { moneyDisplay } from "@core/shared/decimal";
import { orderNo } from "@core/shared/format";
import {
  ORDERS_PAGE_SIZE,
  buildOrdersQuery,
  resolveOrderDateRange,
} from "@core/shared/order-period";
import { Segmented } from "@/components/segmented";
import {
  OrdersEmpty,
  OrdersFilterToolbar,
  OrdersListPanel,
  OrdersPageHeader,
  type OrderListItem,
} from "./orders-ui";
import styles from "./orders.module.css";

const STATUS_BUCKETS = [
  { code: undefined, labelKey: "orders.bucketAll" },
  { code: "CONFIRMED", labelKey: "orders.bucketInWork" },
  { code: "IN_PRODUCTION", labelKey: "orders.bucketProduction" },
  { code: "IN_FG", labelKey: "orders.bucketReady" },
  { code: "COMPLETED", labelKey: "orders.bucketDone" },
] as const;

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

  const [orders, total, statuses] = await Promise.all([
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
  ]);

  const totalPages = Math.max(1, Math.ceil(total / ORDERS_PAGE_SIZE));

  const baseQuery = {
    q: q?.trim() || undefined,
    status: status || undefined,
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
      />

      <div className={styles.navRow}>
        <div className={styles.segScroll}>
          <Segmented
            scroll
            aria-label={t("common.status")}
            items={STATUS_BUCKETS.map((bucket) => ({
              href: buildOrdersQuery({ ...baseQuery, status: bucket.code, page: undefined }),
              label: t(bucket.labelKey),
              active: (bucket.code ?? "") === (status ?? ""),
            }))}
          />
        </div>
        <div className={styles.segScroll}>
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
