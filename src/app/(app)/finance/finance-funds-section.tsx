"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { createFinancialFund } from "@/app/actions/finance";
import { moneyDisplay } from "@core/shared/decimal";
import { FUND } from "@core/finance/finance";
import { createT, type Locale } from "@core/shared/i18n/i18n";
import styles from "./finance.module.css";

export type FinanceFundRow = {
  id: string;
  code: string;
  name: string;
  balance: string;
  balanceNegative: boolean;
};

export function FinanceFundsSection({
  locale,
  funds,
  canAdd,
}: {
  locale: Locale;
  funds: FinanceFundRow[];
  canAdd: boolean;
}) {
  const t = createT(locale);
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function submit(formData: FormData) {
    setError(null);
    startTransition(async () => {
      const result = await createFinancialFund(formData);
      if (result?.error) {
        setError(result.error);
        return;
      }
      setOpen(false);
      router.refresh();
    });
  }

  return (
    <section className={styles.section}>
      <div className={styles.sectionHead}>
        <h2 className={styles.sectionTitleAccent}>{t("fin.funds")}</h2>
        {canAdd ? (
          <button
            type="button"
            className={styles.sectionHeadLink}
            onClick={() => {
              setOpen((v) => !v);
              setError(null);
            }}
            aria-expanded={open}
          >
            {open ? t("common.cancel") : `+ ${t("fin.addFundShort")}`}
          </button>
        ) : null}
      </div>

      {open && canAdd ? (
        <form action={submit} className={styles.fundAddForm}>
          <div className={styles.fundAddRow}>
            <label className={styles.fundAddField}>
              <span className={styles.fundAddLabel}>{t("fin.addFundName")}</span>
              <input name="name" required className="ui-input" placeholder={t("fin.addFundNamePh")} autoFocus />
            </label>
            <label className={styles.fundAddField}>
              <span className={styles.fundAddLabel}>{t("common.amount")}</span>
              <input
                name="amount"
                required
                className="ui-input"
                inputMode="decimal"
                placeholder="0"
              />
            </label>
          </div>
          {error ? <p className={styles.fundAddError}>{error}</p> : null}
          <button type="submit" className={styles.fundAddSubmit} disabled={pending}>
            {pending ? t("common.sending") : t("fin.addFundSubmit")}
          </button>
        </form>
      ) : null}

      <div className={styles.sectionBody}>
        <ul className={styles.balanceList}>
          {funds.map((f) => (
            <li key={f.id} className={styles.balanceRow}>
              <span className={styles.balanceName}>{f.name}</span>
              <span
                className={
                  f.code === FUND.PROFIT
                    ? styles.balanceValueAccent
                    : f.balanceNegative
                      ? styles.balanceValueBad
                      : styles.balanceValue
                }
              >
                {moneyDisplay(f.balance)} с
              </span>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
