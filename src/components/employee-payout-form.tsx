"use client";

import { useActionState, useState, useTransition } from "react";
import { payEmployee } from "@/app/actions/payroll";
import { FormField } from "@/components/form-field";
import { PendingButton } from "@/components/pending-button";
import { createT, type Locale } from "@core/shared/i18n/i18n";
import { D } from "@core/shared/decimal";
import type { PaymentCard } from "@core/config/payment-cards";
import styles from "@/app/(app)/employees/employees.module.css";

type PayChannel = "card" | "cash" | "split";

type Props = {
  locale: Locale;
  userId: string;
  defaultAmount: string;
  paymentCards: PaymentCard[];
};

function parseDec(raw: string) {
  const t = raw.trim().replace(",", ".");
  if (!/^\d+(\.\d{1,4})?$/.test(t)) return null;
  return D(t);
}

export function EmployeePayoutForm({ locale, userId, defaultAmount, paymentCards }: Props) {
  const t = createT(locale);
  const [state, formAction] = useActionState(payEmployee, undefined);
  const [pending, startTransition] = useTransition();
  const [clientError, setClientError] = useState<string | null>(null);
  const [payChannel, setPayChannel] = useState<PayChannel>("cash");
  const [cardId, setCardId] = useState(paymentCards[0]?.id ?? "");
  const [amount, setAmount] = useState(defaultAmount);
  const [cardAmount, setCardAmount] = useState("");
  const [cashAmount, setCashAmount] = useState("");
  const [comment, setComment] = useState("");

  function resolveAmounts() {
    const total = parseDec(amount);
    if (!total || total.lte(0)) return { ok: false as const, error: t("emp.payoutAmountRequired") };
    if (payChannel === "card") {
      if (!cardId) return { ok: false as const, error: t("emp.pickCardRequired") };
      return { paid: total, card: total, cash: D(0), ok: true as const };
    }
    if (payChannel === "cash") {
      return { paid: total, card: D(0), cash: total, ok: true as const };
    }
    const card = parseDec(cardAmount) ?? D(0);
    const cash = parseDec(cashAmount) ?? D(0);
    if (!card.plus(cash).eq(total)) {
      return { ok: false as const, error: t("emp.splitMustEqual") };
    }
    if (card.gt(0) && !cardId) return { ok: false as const, error: t("emp.pickCardRequired") };
    return { paid: total, card, cash, ok: true as const };
  }

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const pay = resolveAmounts();
    if (!pay.ok) {
      setClientError(pay.error);
      return;
    }
    setClientError(null);
    const formData = new FormData(e.currentTarget);
    formData.set("payChannel", payChannel);
    formData.set("cardId", payChannel === "cash" ? "" : cardId);
    formData.set("cardAmount", pay.card.toFixed(4));
    formData.set("cashAmount", pay.cash.toFixed(4));
    formData.set("amount", pay.paid.toFixed(4));
    formData.set("comment", comment.trim());
    startTransition(() => formAction(formData));
  }

  return (
    <form onSubmit={onSubmit} className="grid max-w-xl gap-3">
      <input type="hidden" name="userId" value={userId} />

      <FormField label={`${t("common.amount")}, с`}>
        <input
          name="amountDisplay"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          className="ui-input"
          inputMode="decimal"
          required
        />
      </FormField>

      <div className={styles.payBlock}>
        <p className={styles.payLabel}>{t("emp.payMethod")}</p>
        <div className={styles.paySeg3} role="radiogroup">
          {(
            [
              ["card", t("emp.payCard")],
              ["cash", t("emp.payCash")],
              ["split", t("emp.paySplit")],
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

        {payChannel !== "cash" && paymentCards.length > 0 ? (
          <div className={styles.cardPicker}>
            <p className={styles.paySubLabel}>{t("emp.pickCard")}</p>
            <div className={styles.cardGrid}>
              {paymentCards.map((card) => (
                <button
                  key={card.id}
                  type="button"
                  className={`${styles.cardOption} ${cardId === card.id ? styles.cardOptionActive : ""}`}
                  onClick={() => setCardId(card.id)}
                >
                  <span className={styles.cardName}>{card.name}</span>
                </button>
              ))}
            </div>
          </div>
        ) : null}

        {payChannel === "split" ? (
          <div className={styles.row2}>
            <FormField label={t("emp.cardAmount")} className={styles.fieldTight}>
              <input
                className="ui-input"
                inputMode="decimal"
                value={cardAmount}
                onChange={(e) => setCardAmount(e.target.value)}
                placeholder="0"
              />
            </FormField>
            <FormField label={t("emp.cashAmount")} className={styles.fieldTight}>
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
      </div>

      <FormField label={t("common.comment")}>
        <input
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          placeholder={t("common.comment")}
          className="ui-input"
        />
      </FormField>

      {(clientError || state?.error) ? (
        <p className="text-sm text-[var(--color-danger)]" role="alert">
          {clientError ?? state?.error}
        </p>
      ) : null}
      {state?.ok ? <p className="text-sm text-[var(--success)]">{t("emp.payoutDone")}</p> : null}

      <PendingButton className="ui-btn-primary min-h-[44px]" pendingLabel={t("common.saving")} disabled={pending}>
        {t("emp.payOutBtn")}
      </PendingButton>
    </form>
  );
}
