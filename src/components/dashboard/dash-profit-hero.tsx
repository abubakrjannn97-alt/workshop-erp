"use client";

import { TrendingUp } from "lucide-react";
import { ICON_STROKE } from "@/components/nav-icons";
import styles from "./dash-home.module.css";

export function DashProfitHero({
  profitDisplay,
  profitNegative,
  label,
}: {
  profitDisplay: string;
  profitNegative: boolean;
  label: string;
}) {
  return (
    <section className={styles.profitHeroWrap} data-tour="home-income" aria-label={label}>
      <article
        className={`${styles.profitHero} ${profitNegative ? styles.profitHeroBad : ""}`}
      >
        <div className={styles.profitHeroHead}>
          <div className={styles.profitHeroMain}>
            <span className={styles.profitHeroIcon} aria-hidden>
              <TrendingUp size={20} strokeWidth={ICON_STROKE} />
            </span>
            <p className={styles.profitHeroLabel}>{label}</p>
          </div>
        </div>
        <p className={styles.profitHeroValue}>
          {profitNegative ? "−" : ""}
          {profitDisplay} с
        </p>
      </article>
    </section>
  );
}
