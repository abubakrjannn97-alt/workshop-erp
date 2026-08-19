import { Banknote, CircleDollarSign, PiggyBank, TrendingUp } from "lucide-react";
import { ICON_STROKE } from "@/components/nav-icons";
import styles from "./order-detail.module.css";

type MetricTone = "gold" | "green" | "warn" | "blue";

const TONE_CLASS: Record<MetricTone, string> = {
  gold: styles.metricGold,
  green: styles.metricGreen,
  warn: styles.metricWarn,
  blue: styles.metricBlue,
};

const ICONS = {
  gold: CircleDollarSign,
  green: Banknote,
  warn: PiggyBank,
  blue: TrendingUp,
} as const;

const HINT_TONE_CLASS = {
  muted: styles.metricHint,
  success: styles.metricHintSuccess,
  warn: styles.metricHintWarn,
} as const;

export function OrderDetailMetrics({
  items,
}: {
  items: {
    id: string;
    label: string;
    value: string;
    hint?: string;
    hintTone?: keyof typeof HINT_TONE_CLASS;
    tone: MetricTone;
    icon: keyof typeof ICONS;
  }[];
}) {
  return (
    <div className={styles.metricGrid}>
      {items.map((item) => {
        const Icon = ICONS[item.icon];
        const hintClass = HINT_TONE_CLASS[item.hintTone ?? "muted"];
        return (
          <article key={item.id} className={`${styles.metricCard} ${TONE_CLASS[item.tone]}`}>
            <div className={styles.metricHead}>
              <span className={styles.metricIcon}>
                <Icon size={20} strokeWidth={ICON_STROKE} aria-hidden />
              </span>
              <p className={styles.metricLabel}>{item.label}</p>
            </div>
            <p className={styles.metricValue}>{item.value}</p>
            {item.hint ? <p className={hintClass}>{item.hint}</p> : null}
          </article>
        );
      })}
    </div>
  );
}
