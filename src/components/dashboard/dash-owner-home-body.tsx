"use client";

import Link from "next/link";
import { useState, type ReactNode } from "react";
import { Trash2, Layers } from "lucide-react";
import { DashHomePeriodPicker } from "./dash-home-period-picker";
import { DashMetricStrip } from "./dash-metrics";
import { DashProfitHero } from "./dash-profit-hero";
import { DashRecentOrdersSerialized } from "./dash-recent-orders";
import type { HomeProfitPeriod, OwnerDashboardSnapshots } from "./owner-kpi-data";
import styles from "./dash-home.module.css";

export function DashOwnerHomeBody({
  snapshots,
  greetingTitle,
  profitLabel,
  scrapLabel,
  producedLabel,
  periodLabels,
  recentOrdersTitle,
  emptyOrders,
  ordersPeriodHref,
  viewAllOrdersLabel,
  quickActions,
}: {
  snapshots: OwnerDashboardSnapshots;
  greetingTitle: string;
  profitLabel: string;
  scrapLabel: string;
  producedLabel: string;
  periodLabels: Record<HomeProfitPeriod, string>;
  recentOrdersTitle: string;
  emptyOrders: string;
  ordersPeriodHref: string;
  viewAllOrdersLabel: string;
  quickActions?: ReactNode;
}) {
  const [period, setPeriod] = useState<HomeProfitPeriod>("today");
  const data = snapshots[period];

  return (
    <>
      <div className={styles.homeTopBar}>
        <h1 className={styles.homeTopBarTitle}>{greetingTitle}</h1>
        <DashHomePeriodPicker
          period={period}
          onPeriodChange={setPeriod}
          periodLabels={periodLabels}
          inline
        />
      </div>

      <DashProfitHero
        profitDisplay={data.profitDisplay}
        profitNegative={data.profitNegative}
        label={profitLabel}
      />

      <DashMetricStrip
        variant="compact"
        metrics={[
          {
            id: "scrap",
            tone: "red",
            icon: Trash2,
            label: scrapLabel,
            value: data.scrapValue,
            hint: data.scrapHint,
            hintTone: data.scrapHintTone,
            href: "/production/scrap",
          },
          {
            id: "produced",
            tone: "purple",
            icon: Layers,
            label: producedLabel,
            value: data.producedValue,
            hint: data.producedHint,
            hintTone: data.producedHintTone,
          },
        ]}
      />

      {quickActions}

      <section className={styles.sectionBlock} data-tour="home-orders">
        <h2 className={styles.sectionTitle}>{recentOrdersTitle}</h2>
        <DashRecentOrdersSerialized orders={data.recentOrders} empty={emptyOrders} />
      </section>

      <div className={styles.mobileFooterLink}>
        <Link href={ordersPeriodHref} className={styles.panelFooterLink}>
          {viewAllOrdersLabel}
        </Link>
      </div>
    </>
  );
}
