"use client";

import { useState } from "react";
import { TrendingUp } from "lucide-react";
import { ICON_STROKE } from "@/components/nav-icons";
import { DashHomePeriodPicker } from "@/components/dashboard/dash-home-period-picker";
import type { HomeProfitPeriod } from "@/components/dashboard/owner-kpi-data";
import type { FinancePeriodSnapshots, MoneyLocationCard } from "@core/finance/finance-summary";
import styles from "./finance.module.css";

export function FinanceDashboardBody({
  periodSnapshots,
  moneyCards,
  periodLabels,
  netLabel,
  netOkHint,
  netBadHint,
  netTotalLabel,
}: {
  periodSnapshots: FinancePeriodSnapshots;
  moneyCards: MoneyLocationCard[];
  periodLabels: Record<HomeProfitPeriod, string>;
  netLabel: string;
  netOkHint: string;
  netBadHint: string;
  netTotalLabel: string;
}) {
  const [period, setPeriod] = useState<HomeProfitPeriod>("month");
  const snapshot = periodSnapshots[period];
  const netPositive = !snapshot.netNegative;

  return (
    <>
      <div className={styles.finTopBar}>
        <span className={styles.finTopBarLabel}>{netTotalLabel}</span>
        <DashHomePeriodPicker
          period={period}
          onPeriodChange={setPeriod}
          periodLabels={periodLabels}
          inline
        />
      </div>

      <section className={styles.kpiBoard} data-tour="fin-money" aria-label={netLabel}>
        <article className={`${styles.kpiCard} ${styles.kpiHero} ${netPositive ? styles.kpiHeroOk : styles.kpiHeroBad}`}>
          <div className={styles.kpiTop}>
            <span className={`${styles.kpiIcon} ${styles.kpiIconHero}`}>
              <TrendingUp size={22} strokeWidth={ICON_STROKE} aria-hidden />
            </span>
            <span className={styles.kpiSource}>{periodLabels[period]}</span>
          </div>
          <p className={styles.kpiLabel}>{netLabel}</p>
          <p className={styles.kpiHeroValue}>
            {netPositive ? "" : "−"}
            {snapshot.netProfitDisplay} с
          </p>
          <p className={styles.kpiHint}>{netPositive ? netOkHint : netBadHint}</p>
        </article>
      </section>

      <ul className={styles.moneyCardGrid}>
        {moneyCards.map((card) => (
          <li key={card.id} className={styles.moneyCard}>
            <div className={styles.moneyCardTop}>
              {card.logoUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={card.logoUrl} alt="" className={styles.moneyCardLogo} />
              ) : (
                <span className={styles.moneyCardIcon} aria-hidden>
                  {card.kind === "cash" ? "💵" : "💳"}
                </span>
              )}
              <span className={styles.moneyCardLabel}>{card.label}</span>
            </div>
            <p className={card.amount.lt(0) ? styles.moneyCardValueBad : styles.moneyCardValue}>
              {card.amountDisplay} с
            </p>
          </li>
        ))}
      </ul>
    </>
  );
}
