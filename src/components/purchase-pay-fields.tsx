"use client";

import { useMemo, useState } from "react";
import type { PaymentCard } from "@core/config/payment-cards";
import { FormField } from "@/components/form-field";
import { createT, type Locale } from "@core/shared/i18n/i18n";
import styles from "@/app/(app)/orders/quick/quick-sale.module.css";

export type PurchasePayMode = "paid" | "partial" | "debt";
export type PurchasePayChannel = "cash" | "card";

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

  const activeCards = useMemo(() => paymentCards.filter((c) => c.isActive), [paymentCards]);

  return (
    <div className={styles.payBlock}>
      <input type="hidden" name="payMode" value={payMode} />
      <input type="hidden" name="payChannel" value={payMode === "debt" ? "" : payChannel} />
      <input type="hidden" name="cardId" value={payChannel === "card" ? cardId : ""} />

      <p className={styles.payLabel}>{t("orders.pay")}</p>
      <div className={styles.paySeg} role="radiogroup" aria-label={t("orders.pay")}>
        {(
          [
            ["paid", t("orders.paid")],
            ["partial", t("orders.partial")],
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
          <div className={styles.paySeg} role="radiogroup">
            {(
              [
                ["cash", t("pay.method.cash")],
                ["card", t("pay.method.card")],
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

          {payChannel === "card" && activeCards.length > 0 ? (
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
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={card.logoUrl} alt="" className={styles.cardLogo} />
                    <span className={styles.cardName}>{card.name}</span>
                  </button>
                ))}
              </div>
            </div>
          ) : null}

          {payMode === "partial" ? (
            <FormField label={t("orders.paidAmount")} required className={styles.fieldTight}>
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
