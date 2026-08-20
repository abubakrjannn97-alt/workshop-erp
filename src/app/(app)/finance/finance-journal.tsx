"use client";

import { useState } from "react";
import { moneyDisplay } from "@core/shared/decimal";
import { createT, intlLocale, type Locale } from "@core/shared/i18n/i18n";
import styles from "./finance.module.css";

export type FinanceJournalItem = {
  id: string;
  title: string;
  kind: string;
  where: string;
  amount: string;
  outflow: boolean;
  when: string;
};

export function FinanceJournal({
  locale,
  items,
}: {
  locale: Locale;
  items: FinanceJournalItem[];
}) {
  const t = createT(locale);
  const [open, setOpen] = useState(false);
  const loc = intlLocale(locale);

  return (
    <section className={styles.section}>
      <div className={styles.sectionHead}>
        <div className={styles.debtHeadText}>
          <h2 className={styles.sectionTitle}>{t("fin.moneyMoves")}</h2>
          <p className={styles.debtHeadHint}>{t("fin.moneyMovesHint")}</p>
        </div>
        {items.length > 0 ? (
          <button
            type="button"
            className={styles.toggleListBtn}
            onClick={() => setOpen((v) => !v)}
            aria-expanded={open}
          >
            {open ? t("home.hide") : t("home.seeAll")}
          </button>
        ) : null}
      </div>

      {items.length === 0 ? (
        <div className={styles.empty}>{t("fin.noEntries")}</div>
      ) : !open ? (
        <button
          type="button"
          className={styles.debtCollapsed}
          onClick={() => setOpen(true)}
          aria-expanded={false}
        >
          <span className={styles.debtCollapsedLabel}>
            {t("fin.journalHidden", { n: String(items.length) })}
          </span>
        </button>
      ) : (
        <>
          <div className={styles.tableWrap}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>{t("list.col.what")}</th>
                  <th className={styles.thRight}>{t("list.col.sum")}</th>
                  <th className={styles.thRight}>{t("list.col.when")}</th>
                </tr>
              </thead>
              <tbody>
                {items.map((item) => (
                  <tr key={item.id}>
                    <td>
                      <span className={styles.tdBold}>{item.title}</span>
                      <p className={styles.tdMuted}>
                        {item.kind}
                        {item.where ? ` · ${item.where}` : ""}
                      </p>
                    </td>
                    <td className={`${styles.tdRight} ${item.outflow ? styles.tdBad : ""}`}>
                      {item.outflow ? "−" : "+"}
                      {moneyDisplay(item.amount)} с
                    </td>
                    <td className={`${styles.tdRight} ${styles.tdMuted}`}>
                      {new Date(item.when).toLocaleString(loc, {
                        day: "2-digit",
                        month: "2-digit",
                        year: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <ul className={styles.mobileList}>
            {items.map((item) => (
              <li key={item.id} className={styles.mobileCard}>
                <p className={styles.mobileName}>{item.title}</p>
                <p className={styles.mobileMeta}>
                  {item.kind}
                  {item.where ? ` · ${item.where}` : ""}
                </p>
                <p className={item.outflow ? styles.mobileValueBad : styles.mobileValue}>
                  {item.outflow ? "−" : "+"}
                  {moneyDisplay(item.amount)} с
                </p>
                <p className={styles.mobileMeta}>
                  {new Date(item.when).toLocaleString(loc, {
                    day: "2-digit",
                    month: "2-digit",
                    year: "numeric",
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </p>
              </li>
            ))}
          </ul>
        </>
      )}
    </section>
  );
}
