import Link from "next/link";
import type { ReactNode } from "react";
import { ChevronRight } from "lucide-react";
import { moneyDisplay } from "@core/shared/decimal";
import { orderNo } from "@core/shared/format";
import { ICON_STROKE } from "@/components/nav-icons";
import styles from "./dash-home.module.css";

type RecentOrder = {
  id: string;
  number: string | number;
  total: unknown;
  createdAt: Date;
  dueAt?: Date | null;
  customer: { name: string };
  status: { code: string; name: string };
};

function statusTone(code: string): string {
  if (["COMPLETED", "ISSUED", "DELIVERED"].includes(code)) return styles.statusGreen;
  if (["NEW", "DRAFT", "OFFER", "WAITING"].includes(code)) return styles.statusOrange;
  if (["CONFIRMED", "IN_PRODUCTION", "PRODUCTION", "READY"].includes(code)) return styles.statusBlue;
  return styles.statusGray;
}

function formatDate(date: Date, locale: string) {
  return date.toLocaleDateString(locale, { day: "2-digit", month: "2-digit", year: "numeric" });
}

export function DashRecentOrders({
  orders,
  empty,
  n,
  locale,
  showDate = false,
  layout = "list",
}: {
  orders: RecentOrder[];
  empty: string;
  moreLabel?: string;
  lessLabel?: string;
  t?: (key: string) => string;
  n: (group: string, code: string, fallback: string) => string;
  locale: string;
  variant?: "full" | "customer";
  showDate?: boolean;
  layout?: "list" | "table";
}) {
  if (orders.length === 0) {
    return <p className={styles.empty}>{empty}</p>;
  }

  if (layout === "table") {
    return (
      <div className={styles.tableWrap}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th>№</th>
              <th>Клиент</th>
              <th>Сумма</th>
              <th>Статус</th>
              <th>Срок</th>
              <th aria-hidden />
            </tr>
          </thead>
          <tbody>
            {orders.map((order) => {
              const statusLabel = n("ostatus", order.status.code, order.status.name);
              return (
                <tr key={order.id}>
                  <td>
                    <Link href={`/orders/${order.id}`} className={styles.tableRowLink}>
                      {orderNo(String(order.number))}
                    </Link>
                  </td>
                  <td>{order.customer.name}</td>
                  <td>{moneyDisplay(String(order.total))} с</td>
                  <td>
                    <span className={`${styles.statusPill} ${statusTone(order.status.code)}`}>{statusLabel}</span>
                  </td>
                  <td>{order.dueAt ? formatDate(order.dueAt, locale) : "—"}</td>
                  <td className={styles.tableChevron}>
                    <Link href={`/orders/${order.id}`} aria-label={statusLabel}>
                      <ChevronRight size={16} strokeWidth={ICON_STROKE} aria-hidden />
                    </Link>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    );
  }

  return (
    <ul className={`${styles.list} ${styles.mobileList}`}>
      {orders.map((order) => (
        <li key={order.id}>
          <Link href={`/orders/${order.id}`} className={styles.row}>
            <span className={styles.rowMain}>
              <span className={styles.rowTitle}>
                {orderNo(String(order.number))} · {order.customer.name}
              </span>
              {showDate ? (
                <span className={styles.rowWhy}>
                  {order.createdAt.toLocaleDateString(locale, {
                    day: "2-digit",
                    month: "2-digit",
                    year: "2-digit",
                  })}
                  {" · "}
                  {n("ostatus", order.status.code, order.status.name)}
                </span>
              ) : (
                <span className={styles.rowWhy}>
                  <span className={`${styles.statusPill} ${statusTone(order.status.code)}`}>
                    {n("ostatus", order.status.code, order.status.name)}
                  </span>
                </span>
              )}
            </span>
            <span className={styles.rowMeta}>{moneyDisplay(String(order.total))} с</span>
            <span className={styles.rowGo}>
              <ChevronRight size={16} strokeWidth={ICON_STROKE} aria-hidden />
            </span>
          </Link>
        </li>
      ))}
    </ul>
  );
}

export function DashRecentOrdersAction({ href, children }: { href: string; children: ReactNode }) {
  return (
    <Link href={href} className={styles.sectionAction}>
      {children}
    </Link>
  );
}

export function DashRecentOrdersFooterLink({ href, children }: { href: string; children: ReactNode }) {
  return (
    <Link href={href} className={styles.panelFooterLink}>
      {children}
    </Link>
  );
}
