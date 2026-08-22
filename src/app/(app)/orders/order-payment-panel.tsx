"use client";

import { useState } from "react";
import { AppSelect } from "@/components/app-select";
import { IdempotencyField } from "@/components/idempotency-field";
import { PendingButton } from "@/components/pending-button";
import type { PaymentCard } from "@core/config/payment-cards";
import { formatPaymentMethodLabel } from "@core/orders/payment-method-label";
import { PAYMENT_METHODS } from "@core/orders/order-constants";
import { moneyDisplay } from "@core/shared/decimal";
import { createT, type Locale } from "@core/shared/i18n/i18n";
import detailStyles from "./order-detail.module.css";

export function OrderPaymentPanel({
  locale,
  orderId,
  debtDefault,
  payAction,
  reverseAction,
  canPay,
  payments,
  cards,
  loc,
}: {
  locale: Locale;
  orderId: string;
  debtDefault: string;
  payAction: (formData: FormData) => Promise<void>;
  reverseAction: (formData: FormData) => Promise<void>;
  canPay: boolean;
  payments: {
    id: string;
    amount: string;
    method: string | null;
    comment: string | null;
    createdAt: string;
    reversesId: string | null;
  }[];
  cards: PaymentCard[];
  loc: string;
}) {
  const t = createT(locale);
  const [open, setOpen] = useState(true);
  const [method, setMethod] = useState("cash");
  const hasDebt = Boolean(debtDefault);

  if (!hasDebt) return null;

  const activePayments = payments.filter(
    (p) => !p.reversesId && !payments.some((x) => x.reversesId === p.id),
  );

  return (
    <section className={detailStyles.sectionPanelCompact}>
      <div className={detailStyles.payPanelHead}>
        <h2 className={detailStyles.sectionTitle}>{t("orders.payFromCustomer")}</h2>
        {canPay ? (
          <button
            type="button"
            className={open ? detailStyles.payStepTabOn : detailStyles.payStepTab}
            onClick={() => setOpen((v) => !v)}
          >
            {t("orders.payNow")}
          </button>
        ) : null}
      </div>

      <p className={detailStyles.debtBanner}>
        {t("orders.debtDue")}: <strong>{debtDefault} с</strong>
      </p>

      {activePayments.length > 0 ? (
        <ul className={detailStyles.payList}>
          {activePayments.map((p) => (
            <li key={p.id} className={detailStyles.payListItem}>
              <span>
                {moneyDisplay(p.amount)} с ·{" "}
                {formatPaymentMethodLabel(p.method, cards, t, p.comment)} ·{" "}
                {new Date(p.createdAt).toLocaleDateString(loc, { day: "2-digit", month: "2-digit" })}
              </span>
              {canPay ? (
                <form action={reverseAction}>
                  <input type="hidden" name="paymentId" value={p.id} />
                  <button type="submit" className={detailStyles.linkDanger}>
                    {t("orders.payUndo")}
                  </button>
                </form>
              ) : null}
            </li>
          ))}
        </ul>
      ) : null}

      {canPay && open ? (
        <form action={payAction} className={detailStyles.payFormCompact}>
          <input type="hidden" name="orderId" value={orderId} />
          <IdempotencyField prefix={`pay-${orderId}`} />
          <div className={detailStyles.payFormRow}>
            <input
              name="amount"
              defaultValue={debtDefault}
              className="ui-input"
              inputMode="decimal"
              placeholder="0"
              required
            />
            <AppSelect
              name="method"
              value={method}
              onChange={setMethod}
              options={PAYMENT_METHODS.map((m) => ({
                value: m.code,
                label: t(`pay.method.${m.code}`),
              }))}
            />
          </div>
          <PendingButton className="ui-btn-primary min-h-[40px] w-full" pendingLabel={t("common.sending")}>
            {t("orders.payRecordBtn")}
          </PendingButton>
        </form>
      ) : null}
    </section>
  );
}
