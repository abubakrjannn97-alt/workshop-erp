"use client";

import { useEffect, useRef, useState } from "react";
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
}: {
  day: number;
  month: number;
  onChange: (day: number, month: number) => void;
  onCommit?: (day: number, month: number) => void;
  locale?: string;
}) {
  const [dayText, setDayText] = useState(pad2(day));
  const [monthText, setMonthText] = useState(pad2(month));
  const dayRef = useRef<HTMLInputElement>(null);
  const monthRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setDayText(pad2(day));
    setMonthText(pad2(month));
  }, [day, month]);

  function apply(nextDay: number, nextMonth: number, commit: boolean) {
    const m = Math.min(Math.max(nextMonth, 1), 12);
    const d = clampDay(nextDay, m);
    setDayText(pad2(d));
    setMonthText(pad2(m));
    onChange(d, m);
    if (commit) onCommit?.(d, m);
  }

  function finishDay(raw: string) {
    const digits = raw.replace(/\D/g, "").slice(0, 2);
    const d = Number(digits || day);
    const m = Number(monthText.replace(/\D/g, "") || month);
    apply(d, m, digits.length === 2 && monthText.replace(/\D/g, "").length === 2);
  }

  function finishMonth(raw: string) {
    const digits = raw.replace(/\D/g, "").slice(0, 2);
    const m = Number(digits || month);
    const d = Number(dayText.replace(/\D/g, "") || day);
    apply(d, m, dayText.replace(/\D/g, "").length >= 1 && digits.length === 2);
  }

  return (
    <div className={styles.slots} aria-label="DD.MM">
      <input
        ref={dayRef}
        className={styles.slot}
        inputMode="numeric"
        maxLength={2}
        placeholder="12"
        value={dayText}
        autoFocus
        aria-label="День"
        onChange={(e) => {
          const digits = e.target.value.replace(/\D/g, "").slice(0, 2);
          setDayText(digits);
          if (digits.length === 2) monthRef.current?.focus();
        }}
        onBlur={() => finishDay(dayText)}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            e.preventDefault();
            finishDay(dayText);
            monthRef.current?.focus();
          }
        }}
      />
      <span className={styles.dot} aria-hidden>
        .
      </span>
      <input
        ref={monthRef}
        className={styles.slot}
        inputMode="numeric"
        maxLength={2}
        placeholder="07"
        value={monthText}
        aria-label="Месяц"
        onChange={(e) => {
          const digits = e.target.value.replace(/\D/g, "").slice(0, 2);
          setMonthText(digits);
          if (digits.length === 2) {
            const d = Number(dayText.replace(/\D/g, "") || day);
            apply(d, Number(digits), dayText.replace(/\D/g, "").length >= 1);
          }
        }}
        onBlur={() => finishMonth(monthText)}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            e.preventDefault();
            finishMonth(monthText);
          }
          if (e.key === "Backspace" && monthText.length === 0) {
            e.preventDefault();
            dayRef.current?.focus();
          }
        }}
      />
    </div>
  );
}
