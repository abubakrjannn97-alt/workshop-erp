"use client";

import { useEffect, useRef, useState } from "react";
import { ChevronDown, TrendingUp } from "lucide-react";
import { ICON_STROKE } from "@/components/nav-icons";
import type { HomeProfitPeriod, OwnerProfitKpisClient } from "./owner-kpi-data";
import styles from "./dash-home.module.css";

const PERIODS: HomeProfitPeriod[] = ["today", "week", "month"];

export function DashProfitHero({
  data,
  label,
  periodLabels,
}: {
  data: OwnerProfitKpisClient;
  label: string;
  periodLabels: Record<HomeProfitPeriod, string>;
}) {
  const [period, setPeriod] = useState<HomeProfitPeriod>("today");
  const [menuOpen, setMenuOpen] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);

  const kpi = data[period];
  const profitPositive = !kpi.profitNegative;

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
    <section className={styles.profitHeroWrap} data-tour="home-income" aria-label={label}>
      <article
        className={`${styles.profitHero} ${profitPositive ? styles.profitHeroOk : styles.profitHeroBad}`}
      >
        <div className={styles.profitHeroHead}>
          <div className={styles.profitHeroMain}>
            <span className={styles.profitHeroIcon} aria-hidden>
              <TrendingUp size={20} strokeWidth={ICON_STROKE} />
            </span>
            <p className={styles.profitHeroLabel}>{label}</p>
          </div>
          <div ref={wrapRef} className={styles.profitPeriodWrap}>
            <button
              type="button"
              className={styles.profitPeriodBtn}
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
                        setPeriod(p);
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
        <p className={styles.profitHeroValue}>
          {kpi.profitNegative ? "−" : ""}
          {kpi.profitDisplay} с
        </p>
      </article>
    </section>
  );
}
