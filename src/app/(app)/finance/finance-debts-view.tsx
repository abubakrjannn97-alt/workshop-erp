"use client";

import { useState } from "react";
import Link from "next/link";
import { moneyDisplay } from "@core/shared/decimal";
import { createT, type Locale } from "@core/shared/i18n/i18n";
import styles from "./finance.module.css";

export type DebtLine = { label: string; detail: string };

export type CustomerDebtRow = {
  id: string;
  name: string;
  orderLabel: string;
  debt: string;
  lines: DebtLine[];
};

export type SupplierDebtRow = {
  id: string;
  supplierName: string;
  orderNo: string;
  debt: string;
  lines: DebtLine[];
};

export function FinanceDebtsView({
  locale,
  customerDebts,
  supplierDebts,
  customerTotal,
  supplierTotal,
}: {
  locale: Locale;
  customerDebts: CustomerDebtRow[];
  supplierDebts: SupplierDebtRow[];
  customerTotal: string;
  supplierTotal: string;
}) {
  const t = createT(locale);
  const [tab, setTab] = useState<"customers" | "suppliers">("customers");

  return (
    <div className={styles.debtsPage}>
      <div className={styles.debtsTabs} role="tablist">
        <button
          type="button"
          role="tab"
          aria-selected={tab === "customers"}
          className={`${styles.debtsTab} ${tab === "customers" ? styles.debtsTabActive : ""}`}
          onClick={() => setTab("customers")}
        >
          {t("fin.theyOweUs")}
          {customerDebts.length > 0 ? (
            <span className={styles.debtsTabCount}>{customerDebts.length}</span>
          ) : null}
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={tab === "suppliers"}
          className={`${styles.debtsTab} ${tab === "suppliers" ? styles.debtsTabActive : ""}`}
          onClick={() => setTab("suppliers")}
        >
          {t("an.weOwe")}
          {supplierDebts.length > 0 ? (
            <span className={styles.debtsTabCount}>{supplierDebts.length}</span>
          ) : null}
        </button>
      </div>

      {tab === "customers" ? (
        <section className={styles.section}>
          <div className={styles.sectionHead}>
            <div className={styles.debtHeadText}>
              <h2 className={styles.sectionTitle}>{t("home.debts")}</h2>
              <p className={styles.debtHeadHint}>{t("sales.unpaidHint")}</p>
            </div>
            <span className={styles.debtSummaryBadge}>{moneyDisplay(customerTotal)} с</span>
          </div>
          <div className={styles.sectionBody}>
            {customerDebts.length === 0 ? (
              <p className={styles.emptyInline}>{t("common.empty")}</p>
            ) : (
              <ul className={styles.debtDetailList}>
                {customerDebts.map((row) => (
                  <li key={row.id}>
                    <Link href={`/orders/${row.id}`} className={styles.debtDetailCard}>
                      <div className={styles.debtDetailHead}>
                        <div className={styles.debtDetailMain}>
                          <span className={styles.debtLinkName}>{row.name}</span>
                          <span className={styles.tdMuted}>{row.orderLabel}</span>
                        </div>
                        <span className={styles.balanceValueBad}>{moneyDisplay(row.debt)} с</span>
                      </div>
                      {row.lines.length > 0 ? (
                        <ul className={styles.debtLines}>
                          {row.lines.map((line, i) => (
                            <li key={i} className={styles.debtLine}>
                              <span className={styles.debtLineLabel}>{line.label}</span>
                              <span className={styles.debtLineDetail}>{line.detail}</span>
                            </li>
                          ))}
                        </ul>
                      ) : null}
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </section>
      ) : (
        <section className={styles.section}>
          <div className={styles.sectionHead}>
            <div className={styles.debtHeadText}>
              <h2 className={styles.sectionTitle}>{t("home.weOwe")}</h2>
              <p className={styles.debtHeadHint}>{t("fin.weOweHint")}</p>
            </div>
            <span className={styles.debtSummaryBadge}>{moneyDisplay(supplierTotal)} с</span>
          </div>
          <div className={styles.sectionBody}>
            {supplierDebts.length === 0 ? (
              <p className={styles.emptyInline}>{t("common.empty")}</p>
            ) : (
              <ul className={styles.debtDetailList}>
                {supplierDebts.map((row) => (
                  <li key={row.id}>
                    <Link href={`/purchasing/${row.id}`} className={styles.debtDetailCard}>
                      <div className={styles.debtDetailHead}>
                        <div className={styles.debtDetailMain}>
                          <span className={styles.debtLinkName}>{row.orderNo}</span>
                          <span className={styles.tdMuted}>{row.supplierName}</span>
                        </div>
                        <span className={styles.balanceValueBad}>{moneyDisplay(row.debt)} с</span>
                      </div>
                      {row.lines.length > 0 ? (
                        <ul className={styles.debtLines}>
                          {row.lines.map((line, i) => (
                            <li key={i} className={styles.debtLine}>
                              <span className={styles.debtLineLabel}>{line.label}</span>
                              <span className={styles.debtLineDetail}>{line.detail}</span>
                            </li>
                          ))}
                        </ul>
                      ) : null}
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </section>
      )}
    </div>
  );
}
