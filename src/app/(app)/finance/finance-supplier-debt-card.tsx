"use client";

import Link from "next/link";
import { moneyDisplay } from "@core/shared/decimal";
import { createT, type Locale } from "@core/shared/i18n/i18n";
import styles from "./finance.module.css";

export function FinanceSupplierDebtCard({
  locale,
  total,
  count,
}: {
  locale: Locale;
  total: string;
  count: number;
}) {
  const t = createT(locale);
  const hasDebt = Number(total) > 0;

  return (
    <section className={styles.section}>
      <div className={styles.sectionHead}>
        <h2 className={styles.sectionTitle}>{t("home.weOwe")}</h2>
        <Link href="/finance/debts" className={styles.sectionHeadLink}>
          {t("home.debtsShort")} →
        </Link>
      </div>
      <div className={styles.sectionBody}>
        <p className={styles.debtCardTotalLabel}>{t("fin.supplierDebt")}</p>
        <p className={hasDebt ? `${styles.debtCardTotalValue} ${styles.debtCardTotalWarn}` : styles.debtCardTotalValue}>
          {moneyDisplay(total)} с
        </p>
        <p className={styles.debtCardMeta}>
          {count > 0 ? t("fin.debtsHidden", { n: String(count) }) : t("common.empty")}
        </p>
        <Link href="/finance/debts" className={styles.debtCardLink}>
          {t("home.seeAll")}
        </Link>
      </div>
    </section>
  );
}
