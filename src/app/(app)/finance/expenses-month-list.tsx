"use client";

import { useState } from "react";
import { moneyDisplay } from "@core/shared/decimal";
import { createT, type Locale } from "@core/shared/i18n/i18n";
import styles from "./finance.module.css";

export type ExpenseRow = {
  id: string;
  comment: string | null;
  amount: string;
  dateLabel: string;
};

export function ExpensesMonthList({
  locale,
  entries,
}: {
  locale: Locale;
  entries: ExpenseRow[];
}) {
  const t = createT(locale);
  const [open, setOpen] = useState(false);

  if (entries.length === 0) {
    return <div className={styles.empty}>{t("common.empty")}</div>;
  }

  return (
    <>
      <div className={styles.sectionHead}>
        <h2 className={styles.sectionTitleAccent}>{t("fin.monthExpenses")}</h2>
        <button type="button" className={styles.toggleListBtn} onClick={() => setOpen((v) => !v)} aria-expanded={open}>
          {open ? t("fin.hideExpenses") : t("fin.showExpenses")}
        </button>
      </div>
      {open ? (
        <>
          <div className={styles.tableWrap}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>{t("list.col.what")}</th>
                  <th className={styles.thRight}>{t("list.col.sum")}</th>
                </tr>
              </thead>
              <tbody>
                {entries.map((e) => (
                  <tr key={e.id}>
                    <td>
                      <span className={styles.tdBold}>{e.comment ?? t("fin.expense")}</span>
                      <p className={styles.tdMuted}>{e.dateLabel}</p>
                    </td>
                    <td className={styles.tdRight}>{moneyDisplay(e.amount)} с</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <ul className={styles.mobileList}>
            {entries.map((e) => (
              <li key={e.id} className={styles.mobileCard}>
                <p className={styles.mobileName}>{e.comment ?? t("fin.expense")}</p>
                <p className={styles.mobileMeta}>{e.dateLabel}</p>
                <p className={styles.mobileValue}>{moneyDisplay(e.amount)} с</p>
              </li>
            ))}
          </ul>
        </>
      ) : (
        <div className={styles.sectionBody}>
          <p className={styles.emptyInline}>{t("fin.expensesHidden", { n: String(entries.length) })}</p>
        </div>
      )}
    </>
  );
}
