"use client";

import { useState } from "react";
import { Layers, Wallet } from "lucide-react";
import { ICON_STROKE } from "@/components/nav-icons";
import { DashHomePeriodPicker } from "@/components/dashboard/dash-home-period-picker";
import type { HomeProfitPeriod } from "@/components/dashboard/owner-kpi-data";
import type { WorkerPeriodSnapshots, WorkerProductionByPeriod } from "@core/worker/worker-data";
import { shortProductLabel } from "@core/shared/format";
import { WorkerPageHeader } from "@/components/worker-page-header";
import styles from "./worker-pages.module.css";

export function WorkerStatsBody({
  title,
  snapshots,
  productionByPeriod,
  periodLabels,
  producedLabel,
  earnedLabel,
  debtLabel,
  rateLabel,
  emptyLabel,
}: {
  title: string;
  snapshots: WorkerPeriodSnapshots;
  productionByPeriod: WorkerProductionByPeriod;
  periodLabels: Record<HomeProfitPeriod, string>;
  producedLabel: string;
  earnedLabel: string;
  debtLabel: string;
  rateLabel: string;
  emptyLabel: string;
}) {
  const [period, setPeriod] = useState<HomeProfitPeriod>("month");
  const data = snapshots[period];
  const lines = productionByPeriod[period];

  return (
    <div className={styles.page}>
      <WorkerPageHeader
        title={title}
        trailing={
          <DashHomePeriodPicker period={period} onPeriodChange={setPeriod} periodLabels={periodLabels} inline />
        }
      />
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

      {lines.length === 0 ? (
        <p className={styles.empty}>{emptyLabel}</p>
      ) : (
        <ul className={styles.prodList}>
          {lines.map((line) => (
            <li key={line.productId} className={styles.prodRow}>
              <span className={styles.prodThumb}>
                {line.photoUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={line.photoUrl} alt="" className={styles.prodThumbImg} />
                ) : (
                  <span className={styles.prodThumbEmpty}>{line.name.slice(0, 1)}</span>
                )}
              </span>
              <span className={styles.prodMain}>
                <span className={styles.prodName} title={line.name}>
                  {shortProductLabel(line.name)}
                </span>
                <span className={styles.prodRate}>
                  {rateLabel}: {line.rateDisplay} с
                </span>
              </span>
              <span className={styles.prodQty}>
                <span className={styles.prodQtyValue}>{line.quantityDisplay}</span>
                <span className={styles.prodQtyUnit}>м²</span>
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
