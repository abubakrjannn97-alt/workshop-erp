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
  const [dayText, setDayText] = useState(() => (day ? pad2(day) : ""));
  const [monthText, setMonthText] = useState(() => (month ? pad2(month) : ""));
  const dayRef = useRef<HTMLInputElement>(null);
  const monthRef = useRef<HTMLInputElement>(null);

  function emit(nextDay: number, nextMonth: number, commit: boolean) {
    const m = Math.min(Math.max(nextMonth, 1), 12);
    const d = clampDay(nextDay, m);
    setDayText(pad2(d));
    setMonthText(pad2(m));
    onChange(d, m);
    if (commit) onCommit?.(d, m);
  }

  function tryCommit() {
    const dDigits = dayText.replace(/\D/g, "");
    const mDigits = monthText.replace(/\D/g, "");
    if (dDigits.length < 1 || mDigits.length < 1) return;
    emit(Number(dDigits), Number(mDigits), true);
  }

  return (
    <div className={styles.wrap}>
      <div className={styles.slots} aria-label="28.03">
        <div className={styles.slotCol}>
          <input
            ref={dayRef}
            className={styles.slot}
            inputMode="numeric"
            maxLength={2}
            placeholder="28"
            value={dayText}
            autoFocus={autoFocus}
            aria-label={t("orders.dueDay")}
            onFocus={(e) => e.currentTarget.select()}
            onChange={(e) => {
              const digits = e.target.value.replace(/\D/g, "").slice(0, 2);
              setDayText(digits);
              if (digits.length === 2) monthRef.current?.focus();
            }}
            onBlur={() => {
              const digits = dayText.replace(/\D/g, "");
              if (digits) setDayText(pad2(Number(digits)));
              tryCommit();
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
            maxLength={2}
            placeholder="03"
            value={monthText}
            aria-label={t("orders.dueMonth")}
            onFocus={(e) => e.currentTarget.select()}
            onChange={(e) => {
              const digits = e.target.value.replace(/\D/g, "").slice(0, 2);
              setMonthText(digits);
              if (digits.length === 2) {
                const dDigits = dayText.replace(/\D/g, "");
                const d = dDigits ? Number(dDigits) : day || 1;
                emit(d, Number(digits), dDigits.length >= 1);
              }
            }}
            onBlur={() => {
              const digits = monthText.replace(/\D/g, "");
              if (digits) {
                const m = Math.min(Math.max(Number(digits), 1), 12);
                setMonthText(pad2(m));
              }
              tryCommit();
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                tryCommit();
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
