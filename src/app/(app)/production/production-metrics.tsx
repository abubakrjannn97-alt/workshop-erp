"use client";

import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useRef } from "react";
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

export function ProductionMetrics({ items }: { items: ProductionMetricItem[] }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const detailRef = useRef<HTMLElement | null>(null);

  const fallbackId = items[0]?.id ?? null;
  const requested = searchParams.get("view");
  const activeId =
    requested && items.some((item) => item.id === requested) ? requested : fallbackId;
  const active = items.find((item) => item.id === activeId) ?? null;

  useEffect(() => {
    if (!active || typeof window === "undefined") return;
    // Keep list under the selected card in view on phones.
    if (window.matchMedia("(max-width: 1023px)").matches) {
      detailRef.current?.scrollIntoView({ block: "nearest", behavior: "smooth" });
    }
  }, [activeId, active]);

  function select(id: string) {
    const next = new URLSearchParams(searchParams.toString());
    next.set("view", id);
    router.replace(`${pathname}?${next.toString()}`, { scroll: false });
  }

  return (
    <div className={styles.metricsBlock}>
      <div className={styles.metricGrid} role="tablist" aria-label="production-metrics">
        {items.map((item) => {
          const Icon = ICONS[item.icon];
          const selected = activeId === item.id;
          return (
            <button
              key={item.id}
              type="button"
              role="tab"
              aria-selected={selected}
              aria-controls={`prod-metric-${item.id}`}
              className={`${styles.metricCard} ${TONE_CLASS[item.tone]} ${selected ? styles.metricCardActive : ""}`}
              onClick={() => select(item.id)}
            >
              <div className={styles.metricHead}>
                <span className={styles.metricIcon}>
                  <Icon size={20} strokeWidth={ICON_STROKE} aria-hidden />
                </span>
                <p className={styles.metricLabel}>{item.label}</p>
              </div>
              <p className={styles.metricValue}>{item.value}</p>
              <p className={styles.metricHint}>{item.hint}</p>
            </button>
          );
        })}
      </div>

      {active ? (
        <section
          ref={detailRef}
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
                  <Link href={row.href} prefetch className={styles.metricDetailRow}>
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
