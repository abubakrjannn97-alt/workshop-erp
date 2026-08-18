import Link from "next/link";
import type { ReactNode } from "react";
import { RevealList } from "@/components/reveal-list";
import { StatusBadge, orderTone } from "@/components/status-badge";
import { moneyDisplay } from "@core/shared/decimal";
import { orderNo } from "@core/shared/format";
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
} from "@/components/data-table";

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
  moreLabel,
  lessLabel,
  t,
  n,
  locale,
  variant = "full",
}: {
  orders: RecentOrder[];
  empty: string;
  moreLabel: string;
  lessLabel: string;
  t: (key: string) => string;
  n: (group: string, code: string, fallback: string) => string;
  locale: string;
  variant?: "full" | "customer";
}) {
  if (orders.length === 0) {
    return <DataListEmpty>{empty}</DataListEmpty>;
  }

  if (variant === "customer") {
    return (
      <DataList layout="cols4">
        <DataListHead layout="cols4">
          <DataListHeadCell>{t("home.col.customer")}</DataListHeadCell>
          <DataListHeadCell>{t("home.col.date")}</DataListHeadCell>
          <DataListHeadCell align="right">{t("home.col.amount")}</DataListHeadCell>
          <DataListHeadCell align="right">{t("home.col.status")}</DataListHeadCell>
        </DataListHead>
        <RevealList moreLabel={moreLabel} lessLabel={lessLabel} limit={5} className={dataListStyles.rows}>
          {orders.map((o) => (
            <DataListRow key={o.id} layout="cols4">
              <DataListPrimary title={o.customer.name} href={`/orders/${o.id}`} />
              <DataListCell label={t("home.col.date")}>
                {o.createdAt.toLocaleDateString(locale, { day: "2-digit", month: "2-digit", year: "2-digit" })}
              </DataListCell>
              <DataListMetric label={t("home.col.amount")} value={`${moneyDisplay(String(o.total))} с`} />
              <DataListCell label={t("home.col.status")} align="right">
                <StatusBadge label={n("ostatus", o.status.code, o.status.name)} tone={orderTone(o.status.code)} />
              </DataListCell>
            </DataListRow>
          ))}
        </RevealList>
      </DataList>
    );
  }

  return (
    <DataList layout="colsOrders">
      <DataListHead layout="colsOrders">
        <DataListHeadCell>{t("home.col.order")}</DataListHeadCell>
        <DataListHeadCell>{t("home.col.customer")}</DataListHeadCell>
        <DataListHeadCell align="right">{t("home.col.amount")}</DataListHeadCell>
        <DataListHeadCell align="right">{t("home.col.status")}</DataListHeadCell>
      </DataListHead>
      <RevealList moreLabel={moreLabel} lessLabel={lessLabel} limit={5} className={dataListStyles.rows}>
        {orders.map((o) => (
          <DataListRow key={o.id} layout="colsOrders">
            <DataListPrimary
              title={orderNo(String(o.number))}
              subtitle={o.createdAt.toLocaleDateString(locale, { day: "2-digit", month: "2-digit", year: "2-digit" })}
              href={`/orders/${o.id}`}
            />
            <DataListPrimary title={o.customer.name} href={`/orders/${o.id}`} />
            <DataListMetric label={t("home.col.amount")} value={`${moneyDisplay(String(o.total))} с`} />
            <DataListCell label={t("home.col.status")} align="right">
              <StatusBadge label={n("ostatus", o.status.code, o.status.name)} tone={orderTone(o.status.code)} />
            </DataListCell>
          </DataListRow>
        ))}
      </RevealList>
    </DataList>
  );
}

export function DashRecentOrdersAction({ href, children }: { href: string; children: ReactNode }) {
  return (
    <Link href={href} className="text-[11px] font-semibold text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)]">
      {children}
    </Link>
  );
}
