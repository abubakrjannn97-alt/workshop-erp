import type { ReactNode } from "react";
import styles from "./dash-home.module.css";

export type DashMetric = {
  id: "sales" | "inflow" | "attention" | string;
  label: string;
  value: string;
  hint?: string;
};

const KPI_AREA: Record<string, string> = {
  sales: styles.kpiSales,
  inflow: styles.kpiInflow,
  attention: styles.kpiAttention,
};

export function DashMetricStrip({
  metrics,
  tour,
}: {
  metrics: DashMetric[];
  tour?: string;
}) {
  return (
    <section className={styles.kpiStrip} data-tour={tour} aria-label="Statistics">
      {metrics.map((metric) => (
        <article
          key={metric.id}
          className={`${styles.kpiCard} ${KPI_AREA[metric.id] ?? ""}`.trim()}
        >
          <span className={styles.kpiAccent} aria-hidden />
          <div>
            <p className={styles.kpiLabel}>{metric.label}</p>
            <p className={styles.kpiValue}>{metric.value}</p>
          </div>
          {metric.hint ? <p className={styles.kpiHint}>{metric.hint}</p> : <span />}
        </article>
      ))}
    </section>
  );
}

export function DashSection({
  title,
  action,
  tour,
  children,
  flush,
}: {
  title: string;
  action?: ReactNode;
  tour?: string;
  children: ReactNode;
  flush?: boolean;
}) {
  return (
    <section className={styles.panel} data-tour={tour}>
      <div className={styles.panelHead}>
        <h2 className={styles.sectionTitle}>{title}</h2>
        {action}
      </div>
      <div className={flush ? styles.panelBodyFlush : styles.panelBody}>{children}</div>
    </section>
  );
}
