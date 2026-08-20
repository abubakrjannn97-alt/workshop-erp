"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import { ICON_STROKE } from "@/components/nav-icons";
import styles from "./pay-due-calendar.module.css";

function daysInMonth(year: number, month: number) {
  return new Date(year, month, 0).getDate();
}

const MONTHS_RU = ["Янв", "Фев", "Мар", "Апр", "Май", "Июн", "Июл", "Авг", "Сен", "Окт", "Ноя", "Дек"];
const MONTHS_TJ = ["Янв", "Фев", "Мар", "Апр", "Май", "Июн", "Июл", "Авг", "Сен", "Окт", "Ноя", "Дек"];
const WEEK_RU = ["Пн", "Вт", "Ср", "Чт", "Пт", "Сб", "Вс"];
const WEEK_TJ = ["Дш", "Сш", "Чш", "Пш", "Ҷм", "Шб", "Як"];

export function PayDueCalendar({
  day,
  month,
  onChange,
  locale,
}: {
  day: number;
  month: number;
  onChange: (day: number, month: number) => void;
  locale: string;
}) {
  const year = new Date().getFullYear();
  const months = locale.startsWith("tg") ? MONTHS_TJ : MONTHS_RU;
  const week = locale.startsWith("tg") ? WEEK_TJ : WEEK_RU;
  const maxDay = daysInMonth(year, month);
  const selectedDay = Math.min(day, maxDay);

  // Monday-first weekday index for day 1
  const firstWeekday = (new Date(year, month - 1, 1).getDay() + 6) % 7;
  const cells: Array<number | null> = [
    ...Array.from({ length: firstWeekday }, () => null),
    ...Array.from({ length: maxDay }, (_, i) => i + 1),
  ];
  while (cells.length % 7 !== 0) cells.push(null);

  function shiftMonth(delta: number) {
    let nextMonth = month + delta;
    if (nextMonth < 1) nextMonth = 12;
    if (nextMonth > 12) nextMonth = 1;
    const nextMax = daysInMonth(year, nextMonth);
    onChange(Math.min(selectedDay, nextMax), nextMonth);
  }

  return (
    <div className={styles.cal}>
      <div className={styles.head}>
        <button type="button" className={styles.navBtn} onClick={() => shiftMonth(-1)} aria-label="prev">
          <ChevronLeft size={18} strokeWidth={ICON_STROKE} />
        </button>
        <p className={styles.monthLabel}>{months[month - 1]}</p>
        <button type="button" className={styles.navBtn} onClick={() => shiftMonth(1)} aria-label="next">
          <ChevronRight size={18} strokeWidth={ICON_STROKE} />
        </button>
      </div>
      <div className={styles.week}>
        {week.map((w) => (
          <span key={w} className={styles.weekDay}>{w}</span>
        ))}
      </div>
      <div className={styles.grid}>
        {cells.map((d, idx) =>
          d == null ? (
            <span key={`e-${idx}`} className={styles.empty} />
          ) : (
            <button
              key={d}
              type="button"
              className={d === selectedDay ? styles.dayOn : styles.day}
              onClick={() => onChange(d, month)}
            >
              {d}
            </button>
          ),
        )}
      </div>
    </div>
  );
}
