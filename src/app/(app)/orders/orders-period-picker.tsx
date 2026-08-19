"use client";

import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { Calendar } from "lucide-react";
import { ICON_STROKE } from "@/components/nav-icons";
import { buildOrdersQuery, type OrderPeriod } from "@core/shared/order-period";
import styles from "./orders-period-picker.module.css";

const PRESETS: OrderPeriod[] = ["month", "prev", "all"];

export function OrdersPeriodPicker({
  current,
  fromRaw,
  toRaw,
  status,
  q,
  presetLabels,
  customLabel,
  calendarLabel,
  fromLabel,
  toLabel,
  applyLabel,
}: {
  current: OrderPeriod;
  fromRaw?: string;
  toRaw?: string;
  status?: string;
  q?: string;
  presetLabels: Record<"month" | "prev" | "all", string>;
  customLabel: string;
  calendarLabel: string;
  fromLabel: string;
  toLabel: string;
  applyLabel: string;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const [calendarOpen, setCalendarOpen] = useState(current === "custom");
  const [from, setFrom] = useState(fromRaw ?? "");
  const [to, setTo] = useState(toRaw ?? "");

  function queryFor(period: OrderPeriod, customFrom?: string, customTo?: string) {
    return buildOrdersQuery({
      period: period === "custom" ? "custom" : period,
      from: customFrom,
      to: customTo,
      status,
      q,
      page: undefined,
    });
  }

  return (
    <div className={styles.wrap}>
      <div className={styles.pills}>
        {PRESETS.map((preset) => {
          const active = current === preset;
          return (
            <Link
              key={preset}
              href={`/orders${queryFor(preset)}`}
              className={active ? styles.pillActive : styles.pill}
              scroll={false}
            >
              {presetLabels[preset]}
            </Link>
          );
        })}
        <button
          type="button"
          className={`${styles.calendarToggle} ${current === "custom" || calendarOpen ? styles.calendarToggleActive : ""}`.trim()}
          aria-expanded={calendarOpen}
          aria-label={calendarLabel}
          title={calendarLabel}
          onClick={() => setCalendarOpen((v) => !v)}
        >
          <Calendar size={18} strokeWidth={ICON_STROKE} aria-hidden />
        </button>
      </div>

      {calendarOpen ? (
        <form
          className={styles.calendarPanel}
          onSubmit={(event) => {
            event.preventDefault();
            if (!from.trim()) return;
            const href = queryFor("custom", from.trim(), to.trim() || from.trim());
            router.replace(`${pathname}${href}`, { scroll: false });
            setCalendarOpen(false);
          }}
        >
          <p className={styles.calendarTitle}>{customLabel}</p>
          <div className={styles.dateGrid}>
            <label className={styles.dateField}>
              <span className={styles.dateLabel}>{fromLabel}</span>
              <input
                type="date"
                value={from}
                onChange={(event) => setFrom(event.target.value)}
                className={styles.dateInput}
                required
              />
            </label>
            <label className={styles.dateField}>
              <span className={styles.dateLabel}>{toLabel}</span>
              <input
                type="date"
                value={to}
                onChange={(event) => setTo(event.target.value)}
                className={styles.dateInput}
              />
            </label>
          </div>
          <button type="submit" className={styles.applyBtn} disabled={!from.trim()}>
            {applyLabel}
          </button>
        </form>
      ) : null}
    </div>
  );
}
