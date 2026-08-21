import Link from "next/link";
import { Suspense } from "react";
import {
  ChevronRight,
  ClipboardList,
  Plus,
} from "lucide-react";
import { ICON_STROKE } from "@/components/nav-icons";
import { EmptyState } from "@/components/empty-state";
import { OrdersStatusFilter } from "./orders-status-filter";
import { StatusBadge, orderTone, type BadgeTone } from "@/components/status-badge";
import { moneyDisplay, qtyDisplay } from "@core/shared/decimal";
import styles from "./orders.module.css";

export type OrderListItem = {
  id: string;
  number: number;
  total: unknown;
  paidAmount: unknown;
  dueAt: Date | null;
  customer: { name: string; id: string };
  status: { code: string; name: string };
  items?: {
    quantity: unknown;
    outputQty: unknown;
    product: { name: string; photoUrl?: string | null; saleUnit?: { symbol: string } | null };
  }[];
};

export type OrdersSummary = {
  newCount: number;
  newRevenue: string;
  completedCount: number;
  completedRevenue: string;
};

export function productSummary(order: OrderListItem, moreLabel: (n: number) => string): string {
  const items = order.items ?? [];
  if (items.length === 0) return "—";
  const first = items[0]?.product.name ?? "—";
  if (items.length === 1) return first;
  return `${first} ${moreLabel(items.length - 1)}`;
}

export function isOrderOverdue(order: OrderListItem): boolean {
  if (!order.dueAt) return false;
  if (["COMPLETED", "CANCELLED", "ISSUED"].includes(order.status.code)) return false;
  return order.dueAt.getTime() < Date.now();
}

export function OrdersPageHeader({
  title,
  subtitle,
  historyHref,
  historyLabel,
  canCreate,
  newOrderHref,
  newOrderLabel,
  mobileTools,
}: {
  title: string;
  subtitle: string;
  historyHref: string;
  historyLabel: string;
  canCreate: boolean;
  newOrderHref: string;
  newOrderLabel: string;
  mobileTools?: React.ReactNode;
}) {
  return (
    <header className={styles.header}>
      <div className={styles.headerMain}>
        <div className={styles.headerText}>
          <h1 className={styles.title}>{title}</h1>
          {subtitle ? <p className={styles.subtitle}>{subtitle}</p> : null}
        </div>
        <div className={styles.headerActions}>
          <Link href={historyHref} className={styles.ghostLink}>
            {historyLabel}
          </Link>
        </div>
      </div>
      <Suspense fallback={null}>{mobileTools}</Suspense>
    </header>
  );
}

export function OrdersFilterToolbar({
  statusLabel,
  allStatusesLabel,
  statuses,
  statusValue,
  fromLabel,
  toLabel,
  searchLabelBtn,
  resetLabel,
  periodValue,
  fromValue,
  toValue,
  resetHref,
}: {
  statusLabel: string;
  allStatusesLabel: string;
  statuses: { code: string; name: string }[];
  statusValue?: string;
  fromLabel: string;
  toLabel: string;
  searchLabelBtn: string;
  resetLabel: string;
  periodValue: string;
  fromValue?: string;
  toValue?: string;
  resetHref: string;
}) {
  return (
    <form className={styles.toolbar} method="get" data-tour="orders-search">
      <input type="hidden" name="period" value={periodValue} />

      <div className={styles.filterRow}>
        <label className={styles.toolbarField}>
          <span className={styles.fieldLabel}>{statusLabel}</span>
          <OrdersStatusFilter
            name="status"
            defaultValue={statusValue}
            allLabel={allStatusesLabel}
            statuses={statuses}
          />
        </label>
        <label className={styles.toolbarField}>
          <span className={styles.fieldLabel}>{fromLabel}</span>
          <input type="date" name="from" defaultValue={fromValue ?? ""} className={styles.dateInput} />
        </label>
        <label className={styles.toolbarField}>
          <span className={styles.fieldLabel}>{toLabel}</span>
          <input type="date" name="to" defaultValue={toValue ?? ""} className={styles.dateInput} />
        </label>
      </div>

      <div className={styles.toolbarActions}>
        <button type="submit" name="period" value="custom" className={styles.secondaryBtn}>
          {searchLabelBtn}
        </button>
        <Link href={resetHref} className={styles.resetLink}>
          {resetLabel}
        </Link>
      </div>
    </form>
  );
}

export function OrdersListPanel({
  orders,
  moneyDisplay,
  statusLabel,
  attentionLabel,
  productMoreLabel,
  colCustomer,
  colProduct,
  colStatus,
  colAmount,
  pagination,
}: {
  orders: OrderListItem[];
  moneyDisplay: (v: string) => string;
  statusLabel: (code: string, name: string) => string;
  attentionLabel: string;
  productMoreLabel: (extra: number) => string;
  colCustomer: string;
  colProduct: string;
  colStatus: string;
  colAmount: string;
  pagination?: {
    page: number;
    totalPages: number;
    prevHref?: string;
    nextHref?: string;
    prevLabel: string;
    nextLabel: string;
    meta: string;
  };
}) {
  return (
    <section className={styles.listPanel} data-tour="orders-list">
      <div className={styles.tableHead}>
        <span>{colCustomer}</span>
        <span>{colProduct}</span>
        <span className={styles.tableHeadRight}>{colStatus}</span>
        <span className={styles.tableHeadRight}>{colAmount}</span>
        <span aria-hidden />
      </div>

      <ul className={styles.tableBody}>
        {orders.map((order) => {
          const overdue = isOrderOverdue(order);
          const label = statusLabel(order.status.code, order.status.name);
          return (
            <li key={order.id}>
              <Link
                href={`/orders/${order.id}`}
                className={`${styles.tableRow} ${overdue ? styles.tableRowAttention : ""}`.trim()}
              >
                <span className={styles.customerName}>{order.customer.name}</span>
                <span className={styles.productName}>{productSummary(order, productMoreLabel)}</span>
                <span className={styles.statusCell}>
                  <StatusBadge label={label} tone={orderTone(order.status.code) as BadgeTone} />
                  {overdue ? <span className={styles.attention}>{attentionLabel}</span> : null}
                </span>
                <span className={styles.amount}>{moneyDisplay(String(order.total))} с</span>
                <span className={styles.chevron} aria-hidden>
                  <ChevronRight size={16} strokeWidth={ICON_STROKE} />
                </span>
              </Link>
            </li>
          );
        })}
      </ul>

      <ul className={styles.mobileList}>
        {orders.map((order) => {
          const item = order.items?.[0];
          const product = item?.product;
          const qty = item ? qtyDisplay(String(item.outputQty ?? item.quantity ?? 0)) : "—";
          const unit = product?.saleUnit?.symbol ?? "";
          const photo = product?.photoUrl;
          return (
            <li key={order.id}>
              <Link href={`/orders/${order.id}`} className={styles.mobileCard}>
                <div className={styles.mobileSaleRow}>
                  <div className={styles.mobileSalePhoto}>
                    {photo ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={photo} alt="" className={styles.mobileSaleImg} />
                    ) : (
                      <span className={styles.mobileSalePhotoEmpty}>
                        {(product?.name ?? "?").slice(0, 1)}
                      </span>
                    )}
                  </div>
                  <div className={styles.mobileSaleBody}>
                    <p className={styles.mobileProduct}>{product?.name ?? productSummary(order, productMoreLabel)}</p>
                    <p className={styles.mobileSaleMeta}>
                      {qty} {unit}
                      {" · "}
                      {order.customer.name}
                    </p>
                    <p className={styles.mobileAmount}>{moneyDisplay(String(order.total))} с</p>
                  </div>
                </div>
              </Link>
            </li>
          );
        })}
      </ul>

      {pagination && pagination.totalPages > 1 ? (
        <div className={styles.pagination}>
          {pagination.prevHref ? (
            <Link href={pagination.prevHref} className={styles.paginationBtn}>
              ← {pagination.prevLabel}
            </Link>
          ) : (
            <span className={styles.paginationBtnDisabled} aria-hidden />
          )}
          <span className={styles.paginationMeta}>{pagination.meta}</span>
          {pagination.nextHref ? (
            <Link href={pagination.nextHref} className={styles.paginationBtn}>
              {pagination.nextLabel} →
            </Link>
          ) : (
            <span className={styles.paginationBtnDisabled} aria-hidden />
          )}
        </div>
      ) : null}
    </section>
  );
}

export function OrdersEmpty({
  title,
  description,
  actionHref,
  actionLabel,
}: {
  title: string;
  description: string;
  actionHref?: string;
  actionLabel?: string;
}) {
  return (
    <section className={styles.listPanel}>
      <div className={styles.emptyWrap}>
        <EmptyState
          icon={ClipboardList}
          title={title}
          description={description}
          action={
            actionHref && actionLabel ? (
              <Link href={actionHref} className={styles.primaryBtn}>
                <span className={styles.primaryBtnIcon} aria-hidden>
                  <Plus size={16} strokeWidth={ICON_STROKE} />
                </span>
                {actionLabel}
              </Link>
            ) : undefined
          }
        />
      </div>
    </section>
  );
}
