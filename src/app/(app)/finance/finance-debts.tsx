"use client";

import { useState } from "react";
import { moneyDisplay } from "@core/shared/decimal";
import { createT, type Locale } from "@core/shared/i18n/i18n";
import styles from "./finance.module.css";

export type FinanceDebtLine = {
  materialName: string;
  quantityDisplay: string;
  unit: string;
  lineAmount: string;
};

export type FinanceDebtItem = {
  id: string;
  supplierName: string;
  orderNumber: string;
  amount: string;
  lines: FinanceDebtLine[];
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
                  <th>{t("common.material")}</th>
                  <th className={styles.thRight}>{t("common.quantity")}</th>
                  <th className={styles.thRight}>{t("common.debt")}</th>
                </tr>
              </thead>
              <tbody>
                {items.flatMap((item) =>
                  (item.lines.length > 0 ? item.lines : [null]).map((line, idx) => (
                    <tr key={`${item.id}-${idx}`}>
                      <td>
                        {idx === 0 ? (
                          <>
                            <span className={styles.tdBold}>{item.supplierName}</span>
                            <p className={styles.tdMuted}>
                              {t("fin.purchaseRef", { number: item.orderNumber })}
                            </p>
                          </>
                        ) : null}
                      </td>
                      <td>
                        {line ? (
                          <span className={styles.tdBold}>{line.materialName}</span>
                        ) : (
                          <span className={styles.tdMuted}>
                            {t("fin.purchaseRef", { number: item.orderNumber })}
                          </span>
                        )}
                      </td>
                      <td className={styles.tdRight}>
                        {line ? `${line.quantityDisplay} ${line.unit}` : "—"}
                      </td>
                      <td className={`${styles.tdRight} ${styles.tdBad}`}>
                        {moneyDisplay(line?.lineAmount ?? item.amount)} с
                      </td>
                    </tr>
                  )),
                )}
              </tbody>
            </table>
          </div>
          <ul className={styles.mobileList}>
            {items.map((item) => (
              <li key={item.id} className={styles.debtCard}>
                <div className={styles.debtCardHead}>
                  <span className={styles.debtSupplier}>{item.supplierName}</span>
                  <span className={styles.debtPoRef}>{item.orderNumber}</span>
                </div>
                {item.lines.length > 0 ? (
                  <ul className={styles.debtLines}>
                    {item.lines.map((line, idx) => (
                      <li key={idx} className={styles.debtLine}>
                        <span className={styles.debtLineName}>{line.materialName}</span>
                        <span className={styles.debtLineQty}>
                          {line.quantityDisplay} {line.unit}
                        </span>
                        <span className={styles.debtLineAmt}>{moneyDisplay(line.lineAmount)} с</span>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <div className={styles.debtLine}>
                    <span className={styles.debtLineName}>
                      {t("fin.purchaseRef", { number: item.orderNumber })}
                    </span>
                    <span className={styles.debtLineQty} aria-hidden />
                    <span className={styles.debtLineAmt}>{moneyDisplay(item.amount)} с</span>
                  </div>
                )}
                {item.lines.length > 1 ? (
                  <div className={styles.debtCardTotal}>
                    <span>{t("wh.costTotalSum")}</span>
                    <span>{moneyDisplay(item.amount)} с</span>
                  </div>
                ) : null}
              </li>
            ))}
          </ul>
        </>
      )}
    </section>
  );
}
