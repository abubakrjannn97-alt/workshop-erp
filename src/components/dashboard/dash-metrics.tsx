import type { ReactNode } from "react";
import styles from "./dash-home.module.css";

export type DashMetric = {
  id: string;
  label: string;
  value: string;
  hint?: string;
};

export function DashMetricStrip({
  metrics,
  tour,
}: {
  metrics: DashMetric[];
  tour?: string;
}) {
  return (
    <section className={styles.metrics} data-tour={tour} aria-label="Statistics">
      {metrics.map((metric) => (
        <div key={metric.id} className={styles.metric}>
          <p className={styles.metricLabel}>{metric.label}</p>
          <p className={styles.metricValue}>{metric.value}</p>
          {metric.hint ? <p className={styles.metricHint}>{metric.hint}</p> : null}
        </div>
      ))}
    </section>
  );
}

export function DashHero({
  label,
  value,
  hint,
  tour,
}: {
  label: string;
  value: string;
  hint?: string;
  tour?: string;
}) {
  return (
    <section className={styles.hero} data-tour={tour}>
      <p className={styles.heroLabel}>{label}</p>
      <p className={styles.heroValue}>{value}</p>
      {hint ? <p className={styles.heroHint}>{hint}</p> : null}
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
    <section className={styles.section} data-tour={tour}>
      <div className={styles.sectionHead}>
        <h2 className={styles.sectionTitle}>{title}</h2>
        {action}
      </div>
      {children}
    </section>
  );
}
