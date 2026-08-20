import Link from "next/link";
import { CheckCircle2, Clock3, Factory, Trash2 } from "lucide-react";
import { ICON_STROKE } from "@/components/nav-icons";
import styles from "./production.module.css";

type MetricTone = "blue" | "purple" | "green" | "warn";

export type ProductionMetricRow = {
  id: string;
  href: string;
  name: string;
  product: string;
  meta?: string;
};

export type ProductionMetricItem = {
  id: string;
  label: string;
  value: string;
  hint: string;
  tone: MetricTone;
  icon: keyof typeof ICONS;
  rows: ProductionMetricRow[];
  emptyLabel: string;
};

const TONE_CLASS: Record<MetricTone, string> = {
  blue: styles.metricBlue,
  purple: styles.metricPurple,
  green: styles.metricGreen,
  warn: styles.metricWarn,
};

const ICONS = {
  inProgress: Factory,
  waiting: Clock3,
  done: CheckCircle2,
  scrap: Trash2,
} as const;

/** Server component + <Link> tabs — reliable on mobile/PWA (no client router). */
export function ProductionMetrics({
  items,
  activeId,
}: {
  items: ProductionMetricItem[];
  activeId: string;
}) {
  const active = items.find((item) => item.id === activeId) ?? items[0] ?? null;

  return (
    <div className={styles.metricsBlock}>
      <div className={styles.metricGrid} role="tablist" aria-label="production-metrics">
        {items.map((item) => {
          const Icon = ICONS[item.icon];
          const selected = active?.id === item.id;
          return (
            <Link
              key={item.id}
              href={`/production?view=${item.id}`}
              scroll={false}
              prefetch={false}
              role="tab"
              aria-selected={selected}
              aria-controls={`prod-metric-${item.id}`}
              className={`${styles.metricCard} ${TONE_CLASS[item.tone]} ${selected ? styles.metricCardActive : ""}`}
            >
              <div className={styles.metricHead}>
                <span className={styles.metricIcon}>
                  <Icon size={18} strokeWidth={ICON_STROKE} aria-hidden />
                </span>
                <p className={styles.metricLabel}>{item.label}</p>
              </div>
              <p className={styles.metricValue}>{item.value}</p>
              <p className={styles.metricHint}>{item.hint}</p>
            </Link>
          );
        })}
      </div>

      {active ? (
        <section
          id={`prod-metric-${active.id}`}
          className={styles.metricDetail}
          aria-label={active.label}
          role="tabpanel"
        >
          <div className={styles.metricDetailHead}>
            <h2 className={styles.metricDetailTitle}>{active.label}</h2>
            <span className={styles.metricDetailCount}>{active.value}</span>
          </div>
          {active.rows.length === 0 ? (
            <p className={styles.metricDetailEmpty}>{active.emptyLabel}</p>
          ) : (
            <ul className={styles.metricDetailList}>
              {active.rows.map((row) => (
                <li key={row.id}>
                  <Link href={row.href} prefetch={false} className={styles.metricDetailRow}>
                    <span className={styles.metricDetailText}>
                      <span className={styles.metricDetailName}>{row.name}</span>
                      <span className={styles.metricDetailProduct}>{row.product}</span>
                    </span>
                    {row.meta ? <span className={styles.metricDetailRowMeta}>{row.meta}</span> : null}
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>
      ) : null}
    </div>
  );
}
