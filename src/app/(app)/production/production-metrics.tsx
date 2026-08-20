"use client";

import Link from "next/link";
import { useState } from "react";
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
  const [activeId, setActiveId] = useState<string | null>(null);
  const active = items.find((item) => item.id === activeId) ?? null;

  return (
    <div className={styles.metricsBlock}>
      <div className={styles.metricGrid}>
        {items.map((item) => {
          const Icon = ICONS[item.icon];
          const selected = activeId === item.id;
          return (
            <button
              key={item.id}
              type="button"
              className={`${styles.metricCard} ${TONE_CLASS[item.tone]} ${selected ? styles.metricCardActive : ""}`}
              onClick={() => setActiveId(selected ? null : item.id)}
              aria-expanded={selected}
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
        <section className={styles.metricDetail} aria-label={active.label}>
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
                  <Link href={row.href} className={styles.metricDetailRow}>
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
