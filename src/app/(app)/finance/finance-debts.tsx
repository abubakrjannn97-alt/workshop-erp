"use client";

import { useState } from "react";
import { moneyDisplay } from "@core/shared/decimal";
import { createT, type Locale } from "@core/shared/i18n/i18n";
import styles from "./finance.module.css";

export type FinanceDebtItem = {
  id: string;
  supplierName: string;
  orderNumber: string;
  amount: string;
};

export function FinanceDebts({
  locale,
  items,
}: {
  locale: Locale;
  items: FinanceDebtItem[];
}) {
  const t = createT(locale);
  const [open, setOpen] = useState(false);
  const total = items.reduce((s, item) => s + Number(item.amount || 0), 0);

  return (
    <section className={styles.section}>
      <div className={styles.sectionHead}>
        <div className={styles.debtHeadText}>
          <h2 className={styles.sectionTitle}>{t("fin.weOweSuppliers")}</h2>
          <p className={styles.debtHeadHint}>{t("fin.weOweHint")}</p>
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
        <div className={styles.empty}>{t("common.empty")}</div>
      ) : !open ? (
        <button
          type="button"
          className={styles.debtCollapsed}
          onClick={() => setOpen(true)}
          aria-expanded={false}
        >
          <span className={styles.debtCollapsedLabel}>
            {t("fin.debtsHidden", { n: String(items.length) })}
          </span>
          <span className={styles.debtCollapsedSum}>{moneyDisplay(String(total))} с</span>
        </button>
      ) : (
        <>
          <div className={styles.tableWrap}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>{t("fin.weOweTo")}</th>
                  <th className={styles.thRight}>{t("common.debt")}</th>
                </tr>
              </thead>
              <tbody>
                {items.map((item) => (
                  <tr key={item.id}>
                    <td>
                      <span className={styles.tdBold}>{item.supplierName}</span>
                      <p className={styles.tdMuted}>
                        {t("fin.purchaseRef", { number: item.orderNumber })}
                      </p>
                    </td>
                    <td className={`${styles.tdRight} ${styles.tdBad}`}>
                      {moneyDisplay(item.amount)} с
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <ul className={styles.mobileList}>
            {items.map((item) => (
              <li key={item.id} className={styles.mobileCard}>
                <p className={styles.mobileName}>
                  {t("fin.weOweNamed", { name: item.supplierName })}
                </p>
                <p className={styles.mobileMeta}>
                  {t("fin.purchaseRef", { number: item.orderNumber })}
                </p>
                <p className={styles.mobileValueBad}>{moneyDisplay(item.amount)} с</p>
              </li>
            ))}
          </ul>
        </>
      )}
    </section>
  );
}
