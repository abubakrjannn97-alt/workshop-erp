"use client";

import { useState } from "react";
import { Layers, Wallet } from "lucide-react";
import { ICON_STROKE } from "@/components/nav-icons";
import { DashHomePeriodPicker } from "@/components/dashboard/dash-home-period-picker";
import type { HomeProfitPeriod } from "@/components/dashboard/owner-kpi-data";
import type { WorkerPeriodSnapshots } from "@core/worker/worker-data";
import styles from "./worker-pages.module.css";

export function WorkerStatsBody({
  snapshots,
  periodLabels,
  producedLabel,
  earnedLabel,
  debtLabel,
}: {
  snapshots: WorkerPeriodSnapshots;
  periodLabels: Record<HomeProfitPeriod, string>;
  producedLabel: string;
  earnedLabel: string;
  debtLabel: string;
}) {
  const [period, setPeriod] = useState<HomeProfitPeriod>("month");
  const data = snapshots[period];

  return (
    <div className={styles.page}>
      <div className={styles.periodRow}>
        <DashHomePeriodPicker period={period} onPeriodChange={setPeriod} periodLabels={periodLabels} inline />
      </div>
      <div className={styles.kpiGrid}>
        <article className={styles.kpiCard}>
          <span className={`${styles.kpiIcon} ${styles.kpiPurple}`}>
            <Layers size={20} strokeWidth={ICON_STROKE} aria-hidden />
          </span>
          <p className={styles.kpiLabel}>{producedLabel}</p>
          <p className={styles.kpiValue}>
            {data.producedDisplay} <span className={styles.kpiUnit}>м²</span>
          </p>
        </article>
        <article className={styles.kpiCard}>
          <span className={`${styles.kpiIcon} ${styles.kpiGreen}`}>
            <Wallet size={20} strokeWidth={ICON_STROKE} aria-hidden />
          </span>
          <p className={styles.kpiLabel}>{earnedLabel}</p>
          <p className={styles.kpiValue}>{data.earnedDisplay} с</p>
          <p className={styles.kpiHint}>
            {debtLabel}: {data.debtDisplay} с
          </p>
        </article>
      </div>
    </div>
  );
}
