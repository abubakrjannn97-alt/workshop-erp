import Link from "next/link";
import type { ReactNode } from "react";
import styles from "./data-list.module.css";

export type DataListLayout = "cols2" | "cols3" | "cols4" | "colsOrder" | "colsOrders";

const LAYOUT: Record<DataListLayout, string> = {
  cols2: styles.cols2,
  cols3: styles.cols3,
  cols4: styles.cols4,
  colsOrder: styles.colsOrder,
  colsOrders: styles.colsOrders,
};

export function DataList({
  layout,
  children,
  className = "",
}: {
  layout: DataListLayout;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={`${styles.list} ${className}`.trim()} data-layout={layout}>
      {children}
    </div>
  );
}

export function DataListHead({
  layout,
  children,
}: {
  layout: DataListLayout;
  children: ReactNode;
}) {
  return <div className={`${styles.head} ${LAYOUT[layout]}`}>{children}</div>;
}

export function DataListHeadCell({
  children,
  align = "left",
}: {
  children: ReactNode;
  align?: "left" | "right" | "center";
}) {
  const alignClass =
    align === "right" ? styles.headCellRight : align === "center" ? styles.headCellCenter : "";
  return <span className={alignClass}>{children}</span>;
}

export function DataListRow({
  children,
  layout,
  className = "",
}: {
  children: ReactNode;
  layout: DataListLayout;
  className?: string;
}) {
  return <li className={`${styles.row} ${LAYOUT[layout]} ${className}`.trim()}>{children}</li>;
}

export function DataListPrimary({
  title,
  subtitle,
  href,
}: {
  title: ReactNode;
  subtitle?: ReactNode;
  href?: string;
}) {
  const titleNode = href ? (
    <Link href={href} className={`${styles.primaryTitle} hover:underline`}>
      {title}
    </Link>
  ) : (
    <span className={styles.primaryTitle}>{title}</span>
  );

  return (
    <div className={styles.primary}>
      {titleNode}
      {subtitle ? <span className={styles.primarySub}>{subtitle}</span> : null}
    </div>
  );
}

export type DataListMetricTone = "default" | "good" | "bad" | "muted" | "gold";

export function DataListMetric({
  label,
  value,
  tone = "default",
}: {
  label: string;
  value: ReactNode;
  tone?: DataListMetricTone;
}) {
  const toneClass =
    tone === "good"
      ? styles.metricValueGood
      : tone === "bad"
        ? styles.metricValueBad
        : tone === "muted"
          ? styles.metricValueMuted
          : tone === "gold"
            ? styles.metricValueGold
            : "";

  return (
    <div className={styles.metric}>
      <span className={styles.metricLabel}>{label}</span>
      <span className={`${styles.metricValue} ${toneClass}`.trim()}>{value}</span>
    </div>
  );
}

export function DataListCell({
  label,
  children,
  align = "left",
}: {
  label: string;
  children: ReactNode;
  align?: "left" | "right";
}) {
  return (
    <div
      className={`${styles.cellMuted} ${align === "right" ? styles.cellMutedRight : ""}`.trim()}
      data-label={label}
    >
      {children}
    </div>
  );
}

export function DataListEmpty({ children }: { children: ReactNode }) {
  return <p className={styles.empty}>{children}</p>;
}

export { styles as dataListStyles };
