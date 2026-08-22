import { getTranslator } from "@core/shared/i18n/locale";
import { prisma } from "@core/infrastructure/prisma";
import { requirePermission, hasPermission } from "@core/auth/authz";
import { canSeeMaterialCost } from "@core/rbac/permissions";
import { D, moneyDisplay } from "@core/shared/decimal";
import { materialCostForRecipe, scaleNeed } from "@core/costing/costing";
import { ORDER_STATUS } from "@core/orders/orders";
import {
  ORDERS_PAGE_SIZE,
  buildOrdersQuery,
  resolveOrderDateRange,
} from "@core/shared/order-period";
import { orderListStatusWhere, resolveOrderListBucket } from "@core/shared/orders-list-filter";
import { Segmented } from "@/components/segmented";
import { OrdersMobileHeaderTools } from "./orders-mobile-header-tools";
import { OrdersPeriodPicker } from "./orders-period-picker";
import {
  OrdersEmpty,
  OrdersFilterToolbar,
  OrdersListPanel,
  OrdersPageHeader,
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
  const period = params.period ?? "today";
  const statusFilter = resolveOrderListBucket(status);
  const canCreate = hasPermission(session.user.permissions, session.user.roleCode, "orders.create");
  const showCostKpis = canSeeMaterialCost(session.user.permissions, session.user.roleCode);
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

  const statsWhere = {
    ...periodWhere,
    status: { code: { not: ORDER_STATUS.CANCELLED } },
  };

  const [orders, total, statuses, periodOrders] = await Promise.all([
    prisma.order.findMany({
      where,
      include: {
        customer: true,
        seller: true,
        status: true,
        items: {
          include: { product: { include: { saleUnit: true } } },
          orderBy: { id: "asc" },
          take: 3,
        },
      },
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * ORDERS_PAGE_SIZE,
      take: ORDERS_PAGE_SIZE,
    }),
    prisma.order.count({ where }),
    prisma.orderStatus.findMany({ orderBy: { sortOrder: "asc" } }),
    prisma.order.findMany({
      where: statsWhere,
      select: {
        total: true,
        items: { select: { productId: true, quantity: true } },
      },
    }),
  ]);
  const productIds = [...new Set(periodOrders.flatMap((o) => o.items.map((i) => i.productId)))];
  const productsForCost =
    showCostKpis && productIds.length > 0
      ? await prisma.product.findMany({
          where: { id: { in: productIds } },
          include: {
            recipe: {
              include: {
                versions: {
                  where: { validTo: null },
                  include: {
                    items: { include: { material: { include: { storageUnit: true } }, unit: true } },
                  },
                  take: 1,
                },
              },
            },
          },
        })
      : [];

  const matPerUnit = new Map<string, ReturnType<typeof D>>();
  const laborPerUnit = new Map<string, ReturnType<typeof D>>();
  for (const p of productsForCost) {
    const version = p.recipe?.versions[0];
    if (!version) {
      matPerUnit.set(p.id, D(0));
    } else {
      const scale = scaleNeed(p.recipeBaseQty, 1);
      const cost = materialCostForRecipe(version.items, Number(scale.toString()));
      matPerUnit.set(p.id, cost.total ? D(cost.total) : D(0));
    }
    laborPerUnit.set(p.id, D(String(p.laborRate ?? 0)));
  }

  function orderCost(order: (typeof orders)[number]) {
    let cost = D(0);
    for (const item of order.items) {
      const qty = D(String(item.quantity));
      const mat = matPerUnit.get(item.productId) ?? D(0);
      const labor = laborPerUnit.get(item.productId) ?? D(0);
      cost = cost.plus(qty.mul(mat)).plus(qty.mul(labor));
    }
    return cost;
  }

  let salesSum = D(0);
  let costSum = D(0);
  for (const order of periodOrders) {
    salesSum = salesSum.plus(D(String(order.total)));
    if (!showCostKpis) continue;
    for (const item of order.items) {
      const qty = D(String(item.quantity));
      const mat = matPerUnit.get(item.productId) ?? D(0);
      const labor = laborPerUnit.get(item.productId) ?? D(0);
      costSum = costSum.plus(qty.mul(mat)).plus(qty.mul(labor));
    }
  }
  const marginSum = salesSum.minus(costSum);
  const marginOk = marginSum.gte(0);

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
  const listOrders = orders.map((order) => {
    const cost = showCostKpis ? orderCost(order) : null;
    const total = D(String(order.total));
    return {
      ...order,
      costSum: cost != null ? moneyDisplay(cost) : undefined,
      profitSum: cost != null ? moneyDisplay(total.minus(cost)) : undefined,
    };
  }) as unknown as OrderListItem[];

  return (
    <div className={styles.page}>
      <OrdersPageHeader
        title={t("page.orders")}
        subtitle={t("orders.salesHint")}
        historyHref="/crm/history"
        historyLabel={t("orders.salesHistory")}
        canCreate={canCreate}
        newOrderHref="/orders/quick"
        newOrderLabel={t("sales.quickTitle")}
        mobileTools={
          <OrdersMobileHeaderTools
            canCreate={canCreate}
            newOrderHref="/orders/quick"
            newOrderLabel={t("sales.quickTitle")}
          />
        }
      />

      <div className={styles.navRow}>
        <div className={styles.periodMobile}>
          <OrdersPeriodPicker
            current={resolvedPeriod}
            fromRaw={fromRaw}
            toRaw={toRaw}
            status={statusFilter}
            q={q?.trim()}
            presetLabels={{
              today: t("orders.periodToday"),
              week: t("orders.periodWeek"),
              month: t("orders.periodMonth"),
              prev: t("orders.periodPrev"),
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
                ["today", t("orders.periodToday")],
                ["week", t("orders.periodWeek")],
                ["month", t("orders.periodMonth")],
                ["prev", t("orders.periodPrev")],
              ] as const
            ).map(([p, label]) => ({
              href: buildOrdersQuery({ ...baseQuery, period: p, page: undefined }),
              label,
              active: resolvedPeriod === p,
            }))}
          />
        </div>
      </div>

      <div className={styles.salesKpis}>
        <div className={`${styles.salesKpi} ${styles.salesKpiSales}`}>
          <p className={styles.salesKpiLabel}>{t("orders.kpiSalesSum")}</p>
          <p className={styles.salesKpiValue}>{moneyDisplay(salesSum)} с</p>
        </div>
        {showCostKpis ? (
          <>
            <div className={`${styles.salesKpi} ${styles.salesKpiCost}`}>
              <p className={styles.salesKpiLabel}>{t("orders.kpiCostSum")}</p>
              <p className={styles.salesKpiValue}>{moneyDisplay(costSum)} с</p>
            </div>
            <div
              className={`${styles.salesKpi} ${marginOk ? styles.salesKpiMargin : styles.salesKpiMarginBad}`}
            >
              <p className={styles.salesKpiLabel}>{t("orders.kpiMargin")}</p>
              <p className={styles.salesKpiValue}>{moneyDisplay(marginSum)} с</p>
            </div>
          </>
        ) : (
          <>
            <div className={`${styles.salesKpi} ${styles.salesKpiCost}`}>
              <p className={styles.salesKpiLabel}>{t("orders.kpiCostSum")}</p>
              <p className={styles.salesKpiValue}>—</p>
            </div>
            <div className={`${styles.salesKpi} ${styles.salesKpiMargin}`}>
              <p className={styles.salesKpiLabel}>{t("orders.kpiMargin")}</p>
              <p className={styles.salesKpiValue}>—</p>
            </div>
          </>
        )}
      </div>

      <OrdersFilterToolbar
        statusLabel={t("common.status")}
        allStatusesLabel={t("orders.allStatuses")}
        statuses={statuses.map((s) => ({ code: s.code, name: n("ostatus", s.code, s.name) }))}
        statusValue={status}
        fromLabel={t("orders.dateFrom")}
        toLabel={t("orders.dateTo")}
        searchLabelBtn={t("common.search")}
        resetLabel={t("orders.filterReset")}
        periodValue={resolvedPeriod === "custom" ? "custom" : resolvedPeriod}
        fromValue={fromRaw}
        toValue={toRaw}
        resetHref="/orders"
      />

      {listOrders.length === 0 ? (
        <OrdersEmpty
          title={t("orders.emptyTitle")}
          description={t("orders.emptyDesc")}
          actionHref={canCreate ? "/orders/quick" : undefined}
          actionLabel={canCreate ? t("sales.quickTitle") : undefined}
        />
      ) : (
        <OrdersListPanel
          orders={listOrders}
          moneyDisplay={moneyDisplay}
          statusLabel={statusLabel}
          attentionLabel={t("orders.overdue")}
          productMoreLabel={productMoreLabel}
          showCost={showCostKpis}
          costLabel={t("orders.kpiCostSum")}
          profitLabel={t("orders.kpiMargin")}
          colCustomer={t("common.customer")}
          colProduct={t("common.product")}
          colStatus={t("common.status")}
          colAmount={t("common.amount")}
          pagination={{
            page,
            totalPages,
            prevHref: page > 1 ? buildOrdersQuery({ ...baseQuery, page: page - 1 }) : undefined,
            nextHref:
              page < totalPages ? buildOrdersQuery({ ...baseQuery, page: page + 1 }) : undefined,
            prevLabel: t("common.prev"),
            nextLabel: t("common.next"),
            meta: t("orders.pageMeta", { page: String(page), pages: String(totalPages) }),
          }}
        />
      )}
    </div>
  );
}
