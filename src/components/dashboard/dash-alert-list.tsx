import Link from "next/link";
import type { DashAlert } from "./owner-alerts";
import { RevealList } from "@/components/reveal-list";
import styles from "./dash-home.module.css";

export function DashAlertList({
  alerts,
  empty,
  moreLabel,
  lessLabel,
  openLabel,
  limit = 6,
}: {
  alerts: DashAlert[];
  empty: string;
  moreLabel: string;
  lessLabel: string;
  openLabel: string;
  limit?: number;
}) {
  if (alerts.length === 0) {
    return <p className={styles.empty}>{empty}</p>;
  }

  return (
    <RevealList moreLabel={moreLabel} lessLabel={lessLabel} limit={limit} className="">
      {alerts.map((alert) => (
        <li key={alert.id}>
          <Link href={alert.href} className={styles.row}>
            <span className={styles.rowMain}>
              <span className={styles.rowTitle}>{alert.title}</span>
              {alert.subtitle ? <span className={styles.rowWhy}>{alert.subtitle}</span> : null}
            </span>
            {alert.amount ? <span className={styles.rowMeta}>{alert.amount}</span> : null}
            <span className={styles.rowGo}>{openLabel} →</span>
          </Link>
        </li>
      ))}
    </RevealList>
  );
}

export type DashAttentionCount = {
  href: string;
  label: string;
};

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
    <ul>
      {rows.map((row) => (
        <li key={row.href + row.label}>
          <Link href={row.href} className={styles.row}>
            <span className={styles.rowTitle}>{row.label}</span>
            <span className={styles.rowGo}>→</span>
          </Link>
        </li>
      ))}
    </ul>
  );
}
