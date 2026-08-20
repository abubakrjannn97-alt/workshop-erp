import { CheckCircle2, Clock3, Factory, Trash2 } from "lucide-react";
import { ICON_STROKE } from "@/components/nav-icons";
import styles from "./production.module.css";

type MetricTone = "blue" | "purple" | "green" | "warn";

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

export function ProductionMetrics({
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
