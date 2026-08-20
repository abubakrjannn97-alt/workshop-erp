import { AlertTriangle, PackageCheck } from "lucide-react";
import { ICON_STROKE } from "@/components/nav-icons";
import styles from "./warehouse.module.css";

type MetricTone = "warn" | "green";

const TONE_CLASS: Record<MetricTone, string> = {
  warn: styles.metricWarn,
  green: styles.metricGreen,
};

const ICONS = {
  urgent: AlertTriangle,
  waiting: PackageCheck,
} as const;

export function WarehouseMetrics({
  items,
}: {
  items: {
    id: string;
    label: string;
    value: string;
    hint: string;
    tone: MetricTone;
    icon: keyof typeof ICONS;
  }[];
}) {
  return (
    <div className={styles.metricGrid}>
      {items.map((item) => {
        const Icon = ICONS[item.icon];
        return (
          <article key={item.id} className={`${styles.metricCard} ${TONE_CLASS[item.tone]}`}>
            <div className={styles.metricHead}>
              <span className={styles.metricIcon}>
                <Icon size={20} strokeWidth={ICON_STROKE} aria-hidden />
              </span>
              <p className={styles.metricLabel}>{item.label}</p>
            </div>
            <p className={styles.metricValue}>{item.value}</p>
            <p className={styles.metricHint}>{item.hint}</p>
          </article>
        );
      })}
    </div>
  );
}
