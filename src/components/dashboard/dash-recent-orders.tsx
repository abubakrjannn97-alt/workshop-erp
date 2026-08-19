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
  customer: { name: string };
  status: { code: string; name: string };
};

export function DashRecentOrders({
  orders,
  empty,
  n,
  locale,
  showDate = false,
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
}) {
  if (orders.length === 0) {
    return <p className={styles.empty}>{empty}</p>;
  }

  return (
    <ul className={styles.list}>
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
              ) : null}
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
