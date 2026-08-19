import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";
import styles from "./dash-home.module.css";

export type DashMetricTone = "orange" | "green" | "blue" | "purple";

export type DashMetric = {
  id: string;
  label: string;
  value: string;
  hint?: string;
  hintTone?: "positive" | "negative" | "neutral";
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
  variant = "default",
}: {
  metrics: DashMetric[];
  tour?: string;
  variant?: "default" | "compact";
}) {
  const compact = variant === "compact";

  return (
    <section
      className={compact ? styles.kpiStripCompact : styles.kpiStrip}
      data-tour={tour}
      aria-label="Statistics"
    >
      {metrics.map((metric) => {
        const Icon = metric.icon;
        return (
          <article
            key={metric.id}
            className={`${compact ? styles.kpiCardCompact : styles.kpiCard} ${TONE_CLASS[metric.tone]}`}
          >
            {!compact ? <span className={styles.kpiScenery} aria-hidden /> : null}
            {compact ? (
              <>
                <div className={styles.kpiHeadCompact}>
                  <span className={styles.kpiIconCompact} aria-hidden>
                    <Icon size={20} strokeWidth={1.75} />
                  </span>
                  <p className={styles.kpiLabelCompact}>{metric.label}</p>
                </div>
                <p className={styles.kpiValueCompact}>{metric.value}</p>
                {metric.hint ? (
                  <p
                    className={[
                      styles.kpiHintCompact,
                      metric.hintTone === "positive" ? styles.kpiHintPositive : "",
                      metric.hintTone === "negative" ? styles.kpiHintNegative : "",
                    ]
                      .filter(Boolean)
                      .join(" ")}
                  >
                    {metric.hint}
                  </p>
                ) : (
                  <span className={styles.kpiHintSpacerCompact} aria-hidden />
                )}
              </>
            ) : (
              <>
                <div className={styles.kpiTop}>
                  <span className={styles.kpiIcon} aria-hidden>
                    <Icon size={20} strokeWidth={1.75} />
                  </span>
                </div>
                <div className={styles.kpiContent}>
                  <p className={styles.kpiLabel}>{metric.label}</p>
                  <p className={styles.kpiValue}>{metric.value}</p>
                </div>
                {metric.hint ? (
                  <p
                    className={[
                      styles.kpiHint,
                      metric.hintTone === "positive" ? styles.kpiHintPositive : "",
                      metric.hintTone === "negative" ? styles.kpiHintNegative : "",
                    ]
                      .filter(Boolean)
                      .join(" ")}
                  >
                    {metric.hint}
                  </p>
                ) : (
                  <span className={styles.kpiHintSpacer} aria-hidden />
                )}
              </>
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
  mobile,
}: {
  title: string;
  action?: ReactNode;
  tour?: string;
  children: ReactNode;
  flush?: boolean;
  footer?: ReactNode;
  mobile?: boolean;
}) {
  return (
    <section
      className={`${styles.panel} ${mobile ? styles.panelMobile : ""}`.trim()}
      data-tour={tour}
    >
      <div className={styles.panelHead}>
        <h2 className={styles.sectionTitle}>{title}</h2>
        {action}
      </div>
      <div className={flush ? styles.panelBodyFlush : styles.panelBody}>{children}</div>
      {footer ? <div className={styles.panelFooter}>{footer}</div> : null}
    </section>
  );
}
