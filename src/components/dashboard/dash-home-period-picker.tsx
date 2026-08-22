"use client";

import { useEffect, useRef, useState } from "react";
import { ChevronDown } from "lucide-react";
import { ICON_STROKE } from "@/components/nav-icons";
import type { HomeProfitPeriod } from "./owner-kpi-data";
import styles from "./dash-home.module.css";

const PERIODS: HomeProfitPeriod[] = ["today", "week", "month"];

export function DashHomePeriodPicker({
  period,
  onPeriodChange,
  periodLabels,
}: {
  period: HomeProfitPeriod;
  onPeriodChange: (period: HomeProfitPeriod) => void;
  periodLabels: Record<HomeProfitPeriod, string>;
}) {
  const [menuOpen, setMenuOpen] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!menuOpen) return;
    const onPointer = (event: MouseEvent | TouchEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(event.target as Node)) {
        setMenuOpen(false);
      }
    };
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setMenuOpen(false);
    };
    document.addEventListener("mousedown", onPointer);
    document.addEventListener("touchstart", onPointer);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onPointer);
      document.removeEventListener("touchstart", onPointer);
      document.removeEventListener("keydown", onKey);
    };
  }, [menuOpen]);

  return (
    <div className={styles.periodBar}>
      <div ref={wrapRef} className={styles.periodBarPicker}>
        <button
          type="button"
          className={styles.periodBarBtn}
          aria-expanded={menuOpen}
          aria-haspopup="listbox"
          onClick={() => setMenuOpen((v) => !v)}
        >
          {periodLabels[period]}
          <ChevronDown
            size={14}
            strokeWidth={ICON_STROKE}
            className={`${styles.profitPeriodChevron} ${menuOpen ? styles.profitPeriodChevronOpen : ""}`}
            aria-hidden
          />
        </button>
        {menuOpen ? (
          <ul className={styles.profitPeriodMenu} role="listbox">
            {PERIODS.map((p) => (
              <li key={p}>
                <button
                  type="button"
                  role="option"
                  aria-selected={period === p}
                  className={`${styles.profitPeriodOption} ${period === p ? styles.profitPeriodOptionActive : ""}`}
                  onClick={() => {
                    onPeriodChange(p);
                    setMenuOpen(false);
                  }}
                >
                  {periodLabels[p]}
                </button>
              </li>
            ))}
          </ul>
        ) : null}
      </div>
    </div>
  );
}
