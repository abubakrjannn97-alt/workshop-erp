"use client";

import { useMemo, useState } from "react";
import type { PaymentCard } from "@core/config/payment-cards";
import { FormField } from "@/components/form-field";
import { createT, type Locale } from "@core/shared/i18n/i18n";
import styles from "@/app/(app)/orders/quick/quick-sale.module.css";

export type PurchasePayMode = "paid" | "partial" | "debt";
export type PurchasePayChannel = "cash" | "card" | "split";

export function PurchasePayFields({
  locale,
  paymentCards,
  totalHint,
  defaultPayMode = "paid",
}: {
  locale: Locale;
  paymentCards: PaymentCard[];
  totalHint?: string;
  defaultPayMode?: PurchasePayMode;
}) {
  const t = createT(locale);
  const [payMode, setPayMode] = useState<PurchasePayMode>(defaultPayMode);
  const [payChannel, setPayChannel] = useState<PurchasePayChannel>("cash");
  const [cardId, setCardId] = useState(paymentCards[0]?.id ?? "");
  const [partialAmount, setPartialAmount] = useState("");
  const [cardAmount, setCardAmount] = useState("");
  const [cashAmount, setCashAmount] = useState("");

  const activeCards = useMemo(() => paymentCards.filter((c) => c.isActive), [paymentCards]);

  const resolvedCardAmount = payChannel === "card" ? "" : payChannel === "split" ? cardAmount : "";
  const resolvedCashAmount = payChannel === "cash" ? "" : payChannel === "split" ? cashAmount : "";

  return (
    <div className={styles.payBlock}>
      <input type="hidden" name="payMode" value={payMode} />
      <input type="hidden" name="payChannel" value={payMode === "debt" ? "" : payChannel} />
      <input type="hidden" name="cardId" value={payChannel !== "cash" ? cardId : ""} />
      <input type="hidden" name="cardAmount" value={resolvedCardAmount} />
      <input type="hidden" name="cashAmount" value={resolvedCashAmount} />

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
          <div className={styles.paySeg3} role="radiogroup">
            {(
              [
                ["card", t("sales.quickPayCard")],
                ["cash", t("sales.quickPayCash")],
                ["split", t("sales.quickPaySplit")],
              ] as const
            ).map(([id, label]) => (
              <button
                key={id}
                type="button"
                role="radio"
                aria-checked={payChannel === id}
                className={`${styles.payBtn} ${payChannel === id ? styles.payBtnActive : ""}`}
                onClick={() => setPayChannel(id)}
              >
                {label}
              </button>
            ))}
          </div>

          {payChannel !== "cash" && activeCards.length > 0 ? (
            <div className={styles.cardPicker}>
              <p className={styles.paySubLabel}>{t("sales.quickPickCard")}</p>
              <div className={styles.cardGrid}>
                {activeCards.map((card) => (
                  <button
                    key={card.id}
                    type="button"
                    className={`${styles.cardOption} ${cardId === card.id ? styles.cardOptionActive : ""}`}
                    onClick={() => setCardId(card.id)}
                  >
                    <span className={styles.cardName}>{card.bank}</span>
                  </button>
                ))}
              </div>
            </div>
          ) : null}

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

          {payChannel === "split" ? (
            <div className={styles.row2}>
              <FormField label={t("sales.quickCardAmount")} className={styles.fieldTight}>
                <input
                  className="ui-input"
                  inputMode="decimal"
                  value={cardAmount}
                  onChange={(e) => setCardAmount(e.target.value)}
                  placeholder="0"
                />
              </FormField>
              <FormField label={t("sales.quickCashAmount")} className={styles.fieldTight}>
                <input
                  className="ui-input"
                  inputMode="decimal"
                  value={cashAmount}
                  onChange={(e) => setCashAmount(e.target.value)}
                  placeholder="0"
                />
              </FormField>
            </div>
          ) : null}
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
