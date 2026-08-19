"use client";

import { useState } from "react";
import { AppSelect } from "@/components/app-select";
import { FormField } from "@/components/form-field";
import { IdempotencyField } from "@/components/idempotency-field";
import { PendingButton } from "@/components/pending-button";
import { PAYMENT_METHODS } from "@core/orders/order-constants";
import { moneyDisplay } from "@core/shared/decimal";
import { createT, type Locale } from "@core/shared/i18n/i18n";
import detailStyles from "./order-detail.module.css";

export function OrderPaymentPanel({
  locale,
  orderId,
  customerName,
  debtDefault,
  payAction,
  reverseAction,
  canPay,
  payments,
  loc,
}: {
  locale: Locale;
  orderId: string;
  customerName: string;
  debtDefault: string;
  payAction: (formData: FormData) => Promise<void>;
  reverseAction: (formData: FormData) => Promise<void>;
  canPay: boolean;
  payments: {
    id: string;
    amount: unknown;
    method: string | null;
    createdAt: Date;
    reversesId: string | null;
  }[];
  loc: string;
}) {
  const t = createT(locale);
  const [method, setMethod] = useState("cash");

  return (
    <section className={detailStyles.sectionPanel}>
      <h2 className={detailStyles.sectionTitle}>{t("orders.payFromCustomer")}</h2>
      <p className={detailStyles.sectionHint}>
        {t("orders.payFromCustomerHint", { name: customerName })}
      </p>

      {canPay && debtDefault ? (
        <form action={payAction} className={detailStyles.payForm}>
          <input type="hidden" name="orderId" value={orderId} />
          <IdempotencyField prefix={`pay-${orderId}`} />
          <FormField label={t("orders.payAmountReceived")} className={detailStyles.compactField}>
            <input
              name="amount"
              defaultValue={debtDefault}
              className="ui-input"
              inputMode="decimal"
              placeholder="0"
            />
          </FormField>
          <FormField label={t("orders.payHowReceived")} className={detailStyles.compactField}>
            <AppSelect
              name="method"
              value={method}
              onChange={setMethod}
              options={PAYMENT_METHODS.map((m) => ({
                value: m.code,
                label: t(`pay.method.${m.code}`),
              }))}
            />
          </FormField>
          <FormField label={t("orders.payCommentOptional")} className={detailStyles.compactField}>
            <input name="comment" className="ui-input" placeholder={t("orders.payCommentPh")} />
          </FormField>
          <PendingButton className="ui-btn-primary min-h-[44px] w-full" pendingLabel={t("common.sending")}>
            {t("orders.payRecordBtn")}
          </PendingButton>
        </form>
      ) : canPay ? (
        <p className={detailStyles.sectionNote}>{t("orders.payFullyPaid")}</p>
      ) : null}

      <div className={detailStyles.payHistory}>
        <h3 className={detailStyles.subsectionTitle}>{t("orders.payHistory")}</h3>
        {payments.length === 0 ? (
          <p className={detailStyles.sectionNote}>{t("orders.noPayments")}</p>
        ) : (
          <ul className="ui-list">
            {payments.map((p) => (
              <li key={p.id} className="ui-list-row flex min-h-[44px] items-center justify-between gap-3 text-sm">
                <span>
                  {moneyDisplay(p.amount)} с · {p.method ? t(`pay.method.${p.method}`) : "—"} ·{" "}
                  {p.createdAt.toLocaleString(loc)}
                  {p.reversesId ? ` · ${t("orders.payCancelled")}` : ""}
                </span>
                {canPay && !p.reversesId && !payments.some((x) => x.reversesId === p.id) ? (
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
        )}
      </div>
    </section>
  );
}
