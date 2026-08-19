import type { ReactNode } from "react";
import styles from "./dash-home.module.css";

export type DashMetric = {
  id: "sales" | "inflow" | "attention" | string;
  label: string;
  value: string;
  hint?: string;
};

const METRIC_AREA: Record<string, string> = {
  sales: styles.metricSales,
  inflow: styles.metricInflow,
  attention: styles.metricAttention,
};

export function DashMetricStrip({
  metrics,
  tour,
}: {
  metrics: DashMetric[];
  tour?: string;
}) {
  return (
    <section className={`${styles.panel} ${styles.metrics}`} data-tour={tour} aria-label="Statistics">
      {metrics.map((metric) => (
        <div key={metric.id} className={`${styles.metric} ${METRIC_AREA[metric.id] ?? ""}`.trim()}>
          <p className={styles.metricLabel}>{metric.label}</p>
          <p className={styles.metricValue}>{metric.value}</p>
          {metric.hint ? <p className={styles.metricHint}>{metric.hint}</p> : null}
        </div>
      ))}
    </section>
  );
}

export function DashSection({
  title,
  action,
  tour,
  children,
}: {
  title: string;
  action?: ReactNode;
  tour?: string;
  children: ReactNode;
}) {
  return (
    <section className={styles.panel} data-tour={tour}>
      <div className={styles.panelHead}>
        <h2 className={styles.sectionTitle}>{title}</h2>
        {action}
      </div>
      <div className={styles.panelBody}>{children}</div>
    </section>
  );
}
