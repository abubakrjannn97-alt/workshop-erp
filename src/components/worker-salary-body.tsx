"use client";

import { useMemo, useState } from "react";
import { DashHomePeriodPicker } from "@/components/dashboard/dash-home-period-picker";
import type { HomeProfitPeriod } from "@/components/dashboard/owner-kpi-data";
import { EmployeePayoutHistory, type PayoutRow } from "@/components/employee-payout-history";
import type { Locale } from "@core/shared/i18n/i18n";
import { resolveOrderDateRange } from "@core/shared/order-period";
import styles from "./worker-pages.module.css";

function filterPayouts(rows: PayoutRow[], period: HomeProfitPeriod) {
  const range = resolveOrderDateRange({ period });
  return rows.filter((row) => {
    const when = new Date(row.createdAt);
    if (range.from && when < range.from) return false;
    if (range.to && when > range.to) return false;
    return true;
  });
}

export function WorkerSalaryBody({
  locale,
  payouts,
  periodLabels,
  emptyLabel,
}: {
  locale: Locale;
  payouts: PayoutRow[];
  periodLabels: Record<HomeProfitPeriod, string>;
  emptyLabel: string;
}) {
  const [period, setPeriod] = useState<HomeProfitPeriod>("month");
  const filtered = useMemo(() => filterPayouts(payouts, period), [payouts, period]);

  return (
    <div className={styles.page}>
      <div className={styles.periodRow}>
        <DashHomePeriodPicker period={period} onPeriodChange={setPeriod} periodLabels={periodLabels} inline />
      </div>
      {filtered.length === 0 ? (
        <p className={styles.empty}>{emptyLabel}</p>
      ) : (
        <section className={styles.sectionCard}>
          <EmployeePayoutHistory locale={locale} payouts={filtered} />
        </section>
      )}
    </div>
  );
}
