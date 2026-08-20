"use client";

import { useRef, useState } from "react";
import { createT, type Locale } from "@core/shared/i18n/i18n";
import styles from "./pay-due-calendar.module.css";

function daysInMonth(year: number, month: number) {
  return new Date(year, month, 0).getDate();
}

function pad2(n: number) {
  return String(n).padStart(2, "0");
}

function clampDay(day: number, month: number) {
  const max = daysInMonth(new Date().getFullYear(), month);
  return Math.min(Math.max(day, 1), max);
}

function onlyDigits(raw: string, maxLen: number) {
  return raw.replace(/\D/g, "").slice(0, maxLen);
}

export function PayDueCalendar({
  day,
  month,
  onChange,
  onCommit,
  autoFocus = false,
  locale = "ru",
}: {
  day: number;
  month: number;
  onChange: (day: number, month: number) => void;
  onCommit?: (day: number, month: number) => void;
  locale?: Locale;
  autoFocus?: boolean;
}) {
  const t = createT(locale);
  const [dayText, setDayText] = useState(() => pad2(day));
  const [monthText, setMonthText] = useState(() => pad2(month));
  const dayRef = useRef<HTMLInputElement>(null);
  const monthRef = useRef<HTMLInputElement>(null);
  const editing = useRef<"day" | "month" | null>(null);

  function publish(rawDay: string, rawMonth: string, commit: boolean) {
    const dDigits = onlyDigits(rawDay, 2);
    const mDigits = onlyDigits(rawMonth, 2);
    if (!dDigits || !mDigits) return;

    const m = Math.min(Math.max(Number(mDigits), 1), 12);
    const d = clampDay(Number(dDigits), m);
    const nextDay = pad2(d);
    const nextMonth = pad2(m);

    if (editing.current !== "day") setDayText(nextDay);
    if (editing.current !== "month") setMonthText(nextMonth);

    onChange(d, m);
    if (commit) onCommit?.(d, m);
  }

  return (
    <div className={styles.wrap}>
      <div className={styles.slots} aria-label="28.03">
        <div className={styles.slotCol}>
          <input
            ref={dayRef}
            className={styles.slot}
            inputMode="numeric"
            pattern="[0-9]*"
            maxLength={2}
            placeholder="28"
            value={dayText}
            autoFocus={autoFocus}
            aria-label={t("orders.dueDay")}
            onFocus={(e) => {
              editing.current = "day";
              e.currentTarget.select();
            }}
            onChange={(e) => {
              setDayText(onlyDigits(e.target.value, 2));
            }}
            onBlur={() => {
              editing.current = null;
              const digits = onlyDigits(dayText, 2);
              if (!digits) {
                setDayText(pad2(day));
                return;
              }
              const normalized = pad2(clampDay(Number(digits), Number(onlyDigits(monthText, 2) || month)));
              setDayText(normalized);
              publish(normalized, monthText, true);
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                monthRef.current?.focus();
              }
            }}
          />
          <span className={styles.slotHint}>{t("orders.dueDay")}</span>
        </div>
        <span className={styles.dot} aria-hidden>
          .
        </span>
        <div className={styles.slotCol}>
          <input
            ref={monthRef}
            className={styles.slot}
            inputMode="numeric"
            pattern="[0-9]*"
            maxLength={2}
            placeholder="03"
            value={monthText}
            aria-label={t("orders.dueMonth")}
            onFocus={(e) => {
              editing.current = "month";
              e.currentTarget.select();
            }}
            onChange={(e) => {
              setMonthText(onlyDigits(e.target.value, 2));
            }}
            onBlur={() => {
              editing.current = null;
              const digits = onlyDigits(monthText, 2);
              if (!digits) {
                setMonthText(pad2(month));
                return;
              }
              const m = Math.min(Math.max(Number(digits), 1), 12);
              const normalized = pad2(m);
              setMonthText(normalized);
              publish(dayText, normalized, true);
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                (e.currentTarget as HTMLInputElement).blur();
              }
              if (e.key === "Backspace" && monthText.length === 0) {
                e.preventDefault();
                dayRef.current?.focus();
              }
            }}
          />
          <span className={styles.slotHint}>{t("orders.dueMonth")}</span>
        </div>
      </div>
    </div>
  );
}
