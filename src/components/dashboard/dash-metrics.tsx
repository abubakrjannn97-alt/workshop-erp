import type { LucideIcon } from "lucide-react";
import Link from "next/link";
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
  href?: string;
  /** Full-width hero card (e.g. sales today on home). */
  featured?: boolean;
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
        const featured = compact && metric.featured;
        const card = (
          <article
            className={[
              compact ? styles.kpiCardCompact : styles.kpiCard,
              featured ? styles.kpiCardFeatured : "",
              TONE_CLASS[metric.tone],
            ]
              .filter(Boolean)
              .join(" ")}
          >
            {!compact ? <span className={styles.kpiScenery} aria-hidden /> : null}
            {featured ? (
              <>
                <div className={styles.kpiFeaturedMain}>
                  <span className={styles.kpiIconCompact} aria-hidden>
                    <Icon size={22} strokeWidth={1.75} />
                  </span>
                  <div className={styles.kpiFeaturedText}>
                    <p className={styles.kpiLabelCompact}>{metric.label}</p>
                    <p className={styles.kpiValueFeatured}>{metric.value}</p>
                  </div>
                </div>
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
                ) : null}
              </>
            ) : compact ? (
              <>
                <div className={styles.kpiHeadCompact}>
                  <span className={styles.kpiIconCompact} aria-hidden>
                    <Icon size={18} strokeWidth={1.75} />
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
                    <Icon size={15} strokeWidth={1.75} />
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

        const wrapClass = [
          "min-w-0",
          featured ? styles.kpiFeaturedWrap : "",
          metric.href ? "block no-underline" : "",
        ]
          .filter(Boolean)
          .join(" ");

        return metric.href ? (
          <Link key={metric.id} href={metric.href} className={wrapClass}>
            {card}
          </Link>
        ) : (
          <div key={metric.id} className={wrapClass}>
            {card}
          </div>
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
  mobileList,
}: {
  title: string;
  action?: ReactNode;
  tour?: string;
  children: ReactNode;
  flush?: boolean;
  footer?: ReactNode;
  mobile?: boolean;
  mobileList?: boolean;
}) {
  return (
    <section
      className={`${styles.panel} ${mobile && !mobileList ? styles.panelMobile : ""} ${mobileList ? styles.panelMobileList : ""}`.trim()}
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
