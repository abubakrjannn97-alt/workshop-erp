import Link from "next/link";
import { ChevronRight, Clock, Package, Truck, Wallet } from "lucide-react";
import type { DashAlert } from "./owner-alerts";
import { ICON_STROKE } from "@/components/nav-icons";
import styles from "./dash-home.module.css";

function alertWell(alert: DashAlert) {
  if (alert.tone === "critical") return styles.wellBad;
  if (alert.tone === "warning") return styles.wellWarn;
  return styles.well;
}

function AlertGlyph({ alert }: { alert: DashAlert }) {
  const Icon = alert.id.startsWith("debt")
    ? Wallet
    : alert.id.startsWith("stock")
      ? Package
      : alert.id.startsWith("purchase")
        ? Truck
        : Clock;
  return <Icon size={18} strokeWidth={ICON_STROKE} aria-hidden />;
}

export function DashAlertList({
  alerts,
  empty,
  openLabel,
  limit = 6,
}: {
  alerts: DashAlert[];
  empty: string;
  moreLabel?: string;
  lessLabel?: string;
  openLabel: string;
  limit?: number;
}) {
  if (alerts.length === 0) {
    return <p className={styles.empty}>{empty}</p>;
  }

  return (
    <ul className={styles.list}>
      {alerts.slice(0, limit).map((alert) => (
        <li key={alert.id}>
          <Link href={alert.href} className={styles.row}>
            <span className={`${styles.well} ${alertWell(alert)}`}>
              <AlertGlyph alert={alert} />
            </span>
            <span className={styles.rowMain}>
              <span className={styles.rowTitle}>{alert.title}</span>
              {alert.subtitle ? <span className={styles.rowWhy}>{alert.subtitle}</span> : null}
            </span>
            {alert.amount ? <span className={styles.rowMeta}>{alert.amount}</span> : null}
            <span className={styles.rowGo} aria-label={openLabel}>
              <ChevronRight size={16} strokeWidth={ICON_STROKE} aria-hidden />
            </span>
          </Link>
        </li>
      ))}
    </ul>
  );
}

export type DashAttentionCount = {
  href: string;
  count: number;
  label: string;
  kind: "orders" | "pay" | "stock" | "buy";
};

function countGlyph(kind: DashAttentionCount["kind"]) {
  if (kind === "pay") return Wallet;
  if (kind === "stock") return Package;
  if (kind === "buy") return Truck;
  return Clock;
}

function countWell(kind: DashAttentionCount["kind"]) {
  if (kind === "pay") return styles.wellBad;
  if (kind === "stock" || kind === "orders") return styles.wellWarn;
  return styles.well;
}

export function DashAttentionCounts({
  rows,
  empty,
}: {
  rows: DashAttentionCount[];
  empty: string;
}) {
  if (rows.length === 0) {
    return <p className={styles.empty}>{empty}</p>;
  }

  return (
    <ul className={styles.list}>
      {rows.map((row) => {
        const Icon = countGlyph(row.kind);
        return (
          <li key={row.href + row.kind}>
            <Link href={row.href} className={styles.row}>
              <span className={`${styles.well} ${countWell(row.kind)}`}>
                <Icon size={18} strokeWidth={ICON_STROKE} aria-hidden />
              </span>
              <span className={styles.count}>{row.count}</span>
              <span className={styles.rowTitle}>{row.label}</span>
              <span className={styles.rowGo}>
                <ChevronRight size={16} strokeWidth={ICON_STROKE} aria-hidden />
              </span>
            </Link>
          </li>
        );
      })}
    </ul>
  );
}
