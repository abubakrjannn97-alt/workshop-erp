import Link from "next/link";
import { Suspense } from "react";
import {
  CheckCircle2,
  ChevronRight,
  ClipboardList,
  Plus,
  Search,
  Sparkles,
} from "lucide-react";
import { ICON_STROKE } from "@/components/nav-icons";
import { EmptyState } from "@/components/empty-state";
import { StatusBadge, orderTone, type BadgeTone } from "@/components/status-badge";
import styles from "./orders.module.css";

export type OrderListItem = {
  id: string;
  number: number;
  total: unknown;
  paidAmount: unknown;
  dueAt: Date | null;
  customer: { name: string; id: string };
  status: { code: string; name: string };
  items?: { product: { name: string } }[];
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
          <p className={styles.subtitle}>{subtitle}</p>
        </div>
        <Suspense fallback={null}>{mobileTools}</Suspense>
        <div className={styles.headerActions}>
          <Link href={historyHref} className={styles.ghostLink}>
            {historyLabel}
          </Link>
          {canCreate ? (
            <Link href={newOrderHref} className={styles.primaryBtn} data-tour="orders-new">
              <span className={styles.primaryBtnIcon} aria-hidden>
                <Plus size={16} strokeWidth={ICON_STROKE} />
              </span>
              {newOrderLabel}
            </Link>
          ) : null}
        </div>
      </div>
    </header>
  );
}

export function OrdersSummaryStrip({
  summary,
  labels,
}: {
  summary: OrdersSummary;
  labels: {
    new: string;
    completed: string;
  };
}) {
  const cards = [
    {
      id: "new",
      label: labels.new,
      value: String(summary.newCount),
      hint: `${summary.newRevenue} с`,
      icon: Sparkles,
      tone: styles.summaryOrange,
    },
    {
      id: "completed",
      label: labels.completed,
      value: String(summary.completedCount),
      hint: `${summary.completedRevenue} с`,
      icon: CheckCircle2,
      tone: styles.summaryGreen,
    },
  ];

  return (
    <section className={styles.summaryGrid} aria-label={labels.new}>
      {cards.map((card) => {
        const Icon = card.icon;
        return (
          <article key={card.id} className={`${styles.summaryCard} ${card.tone}`}>
            <span className={styles.summaryIcon}>
              <Icon size={20} strokeWidth={ICON_STROKE} aria-hidden />
            </span>
            <p className={styles.summaryLabel}>{card.label}</p>
            <p className={styles.summaryValue}>{card.value}</p>
            <p className={styles.summaryHint}>{card.hint}</p>
          </article>
        );
      })}
    </section>
  );
}

export function OrdersFilterToolbar({
  searchLabel,
  searchPlaceholder,
  statusLabel,
  allStatusesLabel,
  statuses,
  statusValue,
  fromLabel,
  toLabel,
  searchLabelBtn,
  resetLabel,
  filtersLabel,
  periodValue,
  fromValue,
  toValue,
  qValue,
  resetHref,
}: {
  searchLabel: string;
  searchPlaceholder: string;
  statusLabel: string;
  allStatusesLabel: string;
  statuses: { code: string; name: string }[];
  statusValue?: string;
  fromLabel: string;
  toLabel: string;
  searchLabelBtn: string;
  resetLabel: string;
  filtersLabel: string;
  periodValue: string;
  fromValue?: string;
  toValue?: string;
  qValue?: string;
  resetHref: string;
}) {
  return (
    <form className={styles.toolbar} method="get" data-tour="orders-search">
      <input type="hidden" name="period" value={periodValue} />
      <label className={styles.searchField}>
        <span className={`${styles.fieldLabel} ${styles.searchFieldLabel}`}>{searchLabel}</span>
        <span className={styles.searchInputWrap}>
          <Search size={16} strokeWidth={ICON_STROKE} className={styles.searchIcon} aria-hidden />
          <input
            name="q"
            defaultValue={qValue ?? ""}
            placeholder={searchPlaceholder}
            aria-label={searchLabel}
            className={styles.searchInput}
          />
        </span>
      </label>

      <div className={styles.filterRow}>
        <label className={styles.toolbarField}>
          <span className={styles.fieldLabel}>{statusLabel}</span>
          <select name="status" defaultValue={statusValue ?? ""} className={styles.selectInput}>
            <option value="">{allStatusesLabel}</option>
            {statuses.map((s) => (
              <option key={s.code} value={s.code}>
                {s.name}
              </option>
            ))}
          </select>
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
  orderNo,
  moneyDisplay,
  statusLabel,
  attentionLabel,
  productMoreLabel,
  colOrder,
  colCustomer,
  colProduct,
  colStatus,
  colAmount,
  pagination,
}: {
  orders: OrderListItem[];
  orderNo: (n: number) => string;
  moneyDisplay: (v: string) => string;
  statusLabel: (code: string, name: string) => string;
  attentionLabel: string;
  productMoreLabel: (extra: number) => string;
  colOrder: string;
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
        <span>{colOrder}</span>
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
                <span className={styles.orderNo}>{orderNo(order.number)}</span>
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
          const overdue = isOrderOverdue(order);
          const label = statusLabel(order.status.code, order.status.name);
          return (
            <li key={order.id}>
              <Link
                href={`/orders/${order.id}`}
                className={`${styles.mobileCard} ${overdue ? styles.mobileCardAttention : ""}`.trim()}
              >
                <div className={styles.mobileTop}>
                  <span className={styles.mobileCustomerName}>{order.customer.name}</span>
                  <span className={styles.chevron} aria-hidden>
                    <ChevronRight size={16} strokeWidth={ICON_STROKE} />
                  </span>
                </div>
                <p className={styles.mobileProduct}>{productSummary(order, productMoreLabel)}</p>
                <div className={styles.mobileBottom}>
                  <div className={styles.statusCell}>
                    <StatusBadge label={label} tone={orderTone(order.status.code) as BadgeTone} />
                    {overdue ? <span className={styles.attention}>{attentionLabel}</span> : null}
                  </div>
                  <span className={styles.mobileAmount}>{moneyDisplay(String(order.total))} с</span>
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
