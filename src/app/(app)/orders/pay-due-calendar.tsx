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
  day = null,
  month = null,
  onChange,
  onCommit,
  autoFocus = false,
  locale = "ru",
}: {
  day?: number | null;
  month?: number | null;
  onChange: (day: number, month: number) => void;
  onCommit?: (day: number, month: number) => void;
  locale?: Locale;
  autoFocus?: boolean;
}) {
  const t = createT(locale);
  const [dayText, setDayText] = useState("");
  const [monthText, setMonthText] = useState("");
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

  function goToMonth() {
    // после текущего нажатия клавиши — иначе цифра уезжает в месяц
    queueMicrotask(() => monthRef.current?.focus());
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
            onFocus={() => {
              editing.current = "day";
            }}
            onChange={(e) => {
              const digits = onlyDigits(e.target.value, 2);
              setDayText(digits);
              if (digits.length === 2) goToMonth();
            }}
            onBlur={() => {
              editing.current = null;
              const digits = onlyDigits(dayText, 2);
              if (!digits) {
                setDayText("");
                return;
              }
              const mDigits = onlyDigits(monthText, 2);
              const m = mDigits ? Math.min(Math.max(Number(mDigits), 1), 12) : month ?? 12;
              const normalized = pad2(clampDay(Number(digits), m));
              setDayText(normalized);
              publish(normalized, monthText, true);
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                goToMonth();
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
            onFocus={() => {
              editing.current = "month";
            }}
            onChange={(e) => {
              const digits = onlyDigits(e.target.value, 2);
              setMonthText(digits);
              if (digits.length === 2) {
                publish(dayText, digits, true);
              }
            }}
            onBlur={() => {
              editing.current = null;
              const digits = onlyDigits(monthText, 2);
              if (!digits) {
                setMonthText("");
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
