"use client";

import { useMemo, useState } from "react";
import type { MoneyLocationCard } from "@core/finance/finance-summary";
import { FormField } from "@/components/form-field";
import { createT, type Locale } from "@core/shared/i18n/i18n";
import styles from "./purchase-account-pay-fields.module.css";

export type PurchasePayMode = "paid" | "partial" | "debt";

export function PurchaseAccountPayFields({
  locale,
  payAccounts,
  totalHint,
  defaultPayMode = "paid",
}: {
  locale: Locale;
  payAccounts: MoneyLocationCard[];
  totalHint?: string;
  defaultPayMode?: PurchasePayMode;
}) {
  const t = createT(locale);
  const [payMode, setPayMode] = useState<PurchasePayMode>(defaultPayMode);
  const [accountId, setAccountId] = useState(payAccounts[0]?.id ?? "");
  const [partialAmount, setPartialAmount] = useState("");

  const selected = useMemo(
    () => payAccounts.find((a) => a.id === accountId) ?? payAccounts[0],
    [payAccounts, accountId],
  );

  const payChannel = selected?.kind === "cash" ? "cash" : "card";
  const cardId = selected?.kind === "card" ? selected.id : "";

  return (
    <div className={styles.payBlock}>
      <input type="hidden" name="payMode" value={payMode} />
      <input type="hidden" name="payChannel" value={payMode === "debt" ? "" : payChannel} />
      <input type="hidden" name="cardId" value={payMode === "debt" || payChannel === "cash" ? "" : cardId} />
      <input type="hidden" name="cardAmount" value="" />
      <input type="hidden" name="cashAmount" value="" />

      <p className={styles.payLabel}>{t("orders.payStatus")}</p>
      <div className={styles.paySeg3} role="radiogroup" aria-label={t("orders.payStatus")}>
        {(
          [
            ["paid", t("sales.quickPaid")],
            ["partial", t("sales.quickPartial")],
            ["debt", t("sales.quickDebt")],
          ] as const
        ).map(([id, label]) => (
          <button
            key={id}
            type="button"
            role="radio"
            aria-checked={payMode === id}
            className={`${styles.payBtn} ${payMode === id ? styles.payBtnActive : ""}`}
            onClick={() => setPayMode(id)}
          >
            {label}
          </button>
        ))}
      </div>

      {payMode !== "debt" ? (
        <>
          <p className={styles.payLabel}>{t("sales.quickPayMethod")}</p>
          {payAccounts.length > 0 ? (
            <ul className={styles.moneyCardGrid} role="radiogroup" aria-label={t("sales.quickPayMethod")}>
              {payAccounts.map((account) => {
                const active = selected?.id === account.id;
                const valueLong = account.amountDisplay.replace(/\s/g, "").length > 7;
                return (
                  <li key={account.id}>
                    <button
                      type="button"
                      role="radio"
                      aria-checked={active}
                      className={`${styles.moneyCard} ${account.kind === "cash" ? styles.moneyCardCash : styles.moneyCardBank} ${active ? styles.moneyCardActive : ""}`}
                      onClick={() => setAccountId(account.id)}
                    >
                      <div className={styles.moneyCardTop}>
                        <p className={styles.moneyCardLabel}>{account.label}</p>
                      </div>
                      <div className={styles.moneyCardValueWrap}>
                        <p
                          className={[
                            styles.moneyCardValue,
                            valueLong ? styles.moneyCardValueLong : "",
                            account.amountNegative ? styles.moneyCardValueBad : "",
                          ]
                            .filter(Boolean)
                            .join(" ")}
                        >
                          {account.amountDisplay}
                          <span className={styles.moneyCardCurrency}>с</span>
                        </p>
                      </div>
                    </button>
                  </li>
                );
              })}
            </ul>
          ) : (
            <p className="m-0 text-[12px] text-[var(--ink-2)]">{t("sales.quickPickCard")}</p>
          )}

          {payMode === "partial" ? (
            <FormField label={t("sales.quickPartialAmount")} required className={styles.fieldTight}>
              <input
                name="paidAmount"
                required
                className="ui-input"
                inputMode="decimal"
                value={partialAmount}
                onChange={(e) => setPartialAmount(e.target.value)}
                placeholder={totalHint ?? "0"}
              />
            </FormField>
          ) : (
            <input type="hidden" name="paidAmount" value="" />
          )}
        </>
      ) : (
        <>
          <input type="hidden" name="paidAmount" value="" />
          <p className="m-0 text-[12px] leading-4 text-[var(--ink-2)]">{t("po.payLaterHint")}</p>
        </>
      )}
    </div>
  );
}
