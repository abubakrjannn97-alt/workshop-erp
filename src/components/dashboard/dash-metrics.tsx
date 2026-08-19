import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";
import styles from "./dash-home.module.css";

export type DashMetricTone = "orange" | "green" | "blue" | "purple";

export type DashMetric = {
  id: string;
  label: string;
  value: string;
  hint?: string;
  hintTone?: "positive" | "neutral";
  tone: DashMetricTone;
  icon: LucideIcon;
};

const TONE_CLASS: Record<DashMetricTone, string> = {
  orange: styles.kpiOrange,
  green: styles.kpiGreen,
  blue: styles.kpiBlue,
  purple: styles.kpiPurple,
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
      {metrics.map((metric) => {
        const Icon = metric.icon;
        return (
          <article key={metric.id} className={`${styles.kpiCard} ${TONE_CLASS[metric.tone]}`}>
            <div className={styles.kpiTop}>
              <div>
                <p className={styles.kpiLabel}>{metric.label}</p>
                <p className={styles.kpiValue}>{metric.value}</p>
              </div>
              <span className={styles.kpiIcon} aria-hidden>
                <Icon size={20} strokeWidth={1.75} />
              </span>
            </div>
            {metric.hint ? (
              <p
                className={`${styles.kpiHint} ${metric.hintTone === "positive" ? styles.kpiHintPositive : ""}`.trim()}
              >
                {metric.hint}
              </p>
            ) : (
              <span />
            )}
          </article>
        );
      })}
    </section>
  );
}

export function DashSection({
  title,
  action,
  tour,
  children,
  flush,
  footer,
}: {
  title: string;
  action?: ReactNode;
  tour?: string;
  children: ReactNode;
  flush?: boolean;
  footer?: ReactNode;
}) {
  return (
    <section className={styles.panel} data-tour={tour}>
      <div className={styles.panelHead}>
        <h2 className={styles.sectionTitle}>{title}</h2>
        {action}
      </div>
      <div className={flush ? styles.panelBodyFlush : styles.panelBody}>{children}</div>
      {footer ? <div className={styles.panelFooter}>{footer}</div> : null}
    </section>
  );
}
