"use client";

import { useEffect, useMemo, useState } from "react";
import styles from "./pay-due-calendar.module.css";

function daysInMonth(year: number, month: number) {
  return new Date(year, month, 0).getDate();
}

function pad2(n: number) {
  return String(n).padStart(2, "0");
}

function parseDdMm(raw: string): { day: number; month: number } | null {
  const m = raw.trim().match(/^(\d{1,2})[./](\d{1,2})$/);
  if (!m) return null;
  const day = Number(m[1]);
  const month = Number(m[2]);
  if (month < 1 || month > 12 || day < 1) return null;
  const max = daysInMonth(new Date().getFullYear(), month);
  if (day > max) return null;
  return { day, month };
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
  const [text, setText] = useState(`${pad2(day)}.${pad2(month)}`);
  const [error, setError] = useState(false);

  useEffect(() => {
    setText(`${pad2(day)}.${pad2(month)}`);
  }, [day, month]);

  const placeholder = useMemo(() => {
    const now = new Date();
    return `${pad2(now.getDate())}.${pad2(now.getMonth() + 1)}`;
  }, []);

  function commit(raw: string) {
    const parsed = parseDdMm(raw);
    if (!parsed) {
      setError(true);
      return null;
    }
    setError(false);
    setText(`${pad2(parsed.day)}.${pad2(parsed.month)}`);
    onChange(parsed.day, parsed.month);
    onCommit?.(parsed.day, parsed.month);
    return parsed;
  }

  return (
    <div className={styles.simple}>
      <input
        className={`${styles.dateInput} ${error ? styles.dateInputError : ""}`.trim()}
        inputMode="numeric"
        placeholder={placeholder}
        value={text}
        autoFocus
        onChange={(e) => {
          const next = e.target.value.replace(/[^\d./]/g, "").slice(0, 5);
          setText(next);
          setError(false);
          const parsed = parseDdMm(next);
          if (parsed) {
            onChange(parsed.day, parsed.month);
            // полная дата вида 23.08 — сразу запоминаем
            if (/^\d{2}\.\d{2}$/.test(next)) {
              onCommit?.(parsed.day, parsed.month);
            }
          }
        }}
        onBlur={() => commit(text)}
        aria-label="DD.MM"
      />
    </div>
  );
}
