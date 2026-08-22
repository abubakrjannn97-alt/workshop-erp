import Link from "next/link";
import type { ReactNode } from "react";
import { ChevronRight } from "lucide-react";
import { moneyDisplay } from "@core/shared/decimal";
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
  items?: { product: { name: string; photoUrl?: string | null } }[];
};

function productSummary(order: RecentOrder): string {
  const items = order.items ?? [];
  if (items.length === 0) return "—";
  const first = items[0]?.product.name ?? "—";
  if (items.length === 1) return first;
  return `${first} +${items.length - 1}`;
}

function orderPhotoItems(order: RecentOrder) {
  const items = order.items ?? [];
  if (items.length === 0) return [null];
  return items.slice(0, 3);
}

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
  layout?: "list" | "table" | "mobileCards";
}) {
  if (orders.length === 0) {
    return <p className={styles.empty}>{empty}</p>;
  }

  if (layout === "mobileCards") {
    return (
      <ul className={styles.orderCards}>
        {orders.map((order) => {
          const statusLabel = n("ostatus", order.status.code, order.status.name);
          return (
            <li key={order.id}>
              <Link href={`/orders/${order.id}`} className={`${styles.orderCard} ${styles.mobileGlassCard}`}>
                <div className={styles.orderCardPhotos} aria-hidden>
                  {orderPhotoItems(order).map((item, index) => {
                    const photo = item?.product.photoUrl;
                    const letter = (item?.product.name ?? "?").slice(0, 1);
                    return (
                      <span
                        key={`${order.id}-ph-${index}`}
                        className={styles.orderCardPhoto}
                        style={index > 0 ? { marginLeft: -8 } : undefined}
                      >
                        {photo ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={photo} alt="" className={styles.orderCardPhotoImg} />
                        ) : (
                          <span className={styles.orderCardPhotoEmpty}>{letter}</span>
                        )}
                      </span>
                    );
                  })}
                </div>
                <div className={styles.orderCardMain}>
                  <div className={styles.orderCardTop}>
                    <span className={styles.orderCardClient}>{order.customer.name}</span>
                    <span className={styles.orderCardAmount}>{moneyDisplay(String(order.total))} с</span>
                  </div>
                  <div className={styles.orderCardBottom}>
                    <span className={styles.orderCardProduct}>{productSummary(order)}</span>
                    <span className={`${styles.statusPill} ${statusTone(order.status.code)}`}>{statusLabel}</span>
                    <span className={styles.orderCardGo}>
                      <ChevronRight size={16} strokeWidth={ICON_STROKE} aria-hidden />
                    </span>
                  </div>
                </div>
              </Link>
            </li>
          );
        })}
      </ul>
    );
  }

  if (layout === "table") {
    return (
      <div className={styles.tableWrap}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th>Клиент</th>
              <th>Продукция</th>
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
                      {order.customer.name}
                    </Link>
                  </td>
                  <td className={styles.tableProduct}>{productSummary(order)}</td>
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
              <span className={styles.rowTitle}>{order.customer.name}</span>
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

export type SerializedRecentOrderCard = {
  id: string;
  customerName: string;
  totalDisplay: string;
  statusLabel: string;
  statusCode: string;
  productSummary: string;
  photos: { url?: string; letter: string }[];
};

export function DashRecentOrdersSerialized({
  orders,
  empty,
}: {
  orders: SerializedRecentOrderCard[];
  empty: string;
}) {
  if (orders.length === 0) {
    return <p className={styles.empty}>{empty}</p>;
  }

  return (
    <ul className={styles.orderCards}>
      {orders.map((order) => (
        <li key={order.id}>
          <Link href={`/orders/${order.id}`} className={`${styles.orderCard} ${styles.mobileGlassCard}`}>
            <div className={styles.orderCardPhotos} aria-hidden>
              {order.photos.map((photo, index) => (
                <span
                  key={`${order.id}-ph-${index}`}
                  className={styles.orderCardPhoto}
                  style={index > 0 ? { marginLeft: -8 } : undefined}
                >
                  {photo.url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={photo.url} alt="" className={styles.orderCardPhotoImg} />
                  ) : (
                    <span className={styles.orderCardPhotoEmpty}>{photo.letter}</span>
                  )}
                </span>
              ))}
            </div>
            <div className={styles.orderCardMain}>
              <div className={styles.orderCardTop}>
                <span className={styles.orderCardClient}>{order.customerName}</span>
                <span className={styles.orderCardAmount}>{order.totalDisplay} с</span>
              </div>
              <div className={styles.orderCardBottom}>
                <span className={styles.orderCardProduct}>{order.productSummary}</span>
                <span className={`${styles.statusPill} ${statusTone(order.statusCode)}`}>{order.statusLabel}</span>
                <span className={styles.orderCardGo}>
                  <ChevronRight size={16} strokeWidth={ICON_STROKE} aria-hidden />
                </span>
              </div>
            </div>
          </Link>
        </li>
      ))}
    </ul>
  );
}
