import Link from "next/link";
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
  activeId,
  basePath = "/warehouse",
}: {
  items: {
    id: string;
    label: string;
    value: string;
    hint: string;
    tone: MetricTone;
    icon: keyof typeof ICONS;
  }[];
  activeId: string;
  basePath?: string;
}) {
  return (
    <div className={styles.metricGrid} role="tablist">
      {items.map((item) => {
        const Icon = ICONS[item.icon];
        const selected = activeId === item.id;
        return (
          <Link
            key={item.id}
            href={`${basePath}?view=${item.id}`}
            scroll={false}
            prefetch={false}
            role="tab"
            aria-selected={selected}
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
  );
}
