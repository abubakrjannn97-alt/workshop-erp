"use client";

import { useState } from "react";
import { AppSelect } from "@/components/app-select";
import { FormField } from "@/components/form-field";
import { IdempotencyField } from "@/components/idempotency-field";
import { PendingButton } from "@/components/pending-button";
import { PAYMENT_METHODS } from "@core/orders/order-constants";
import { createT, type Locale } from "@core/shared/i18n/i18n";
import detailStyles from "./order-detail.module.css";

function daysInMonth(year: number, month: number) {
  return new Date(year, month, 0).getDate();
}

export function OrderPayStepPanel({
  locale,
  orderId,
  debtDefault,
  payAction,
  payLaterAction,
  canPay,
}: {
  locale: Locale;
  orderId: string;
  debtDefault: string;
  payAction: (formData: FormData) => Promise<void>;
  payLaterAction: (formData: FormData) => Promise<void>;
  canPay: boolean;
}) {
  const t = createT(locale);
  const now = new Date();
  const [mode, setMode] = useState<"pay" | "later" | null>(null);
  const [method, setMethod] = useState("cash");
  const [dueDay, setDueDay] = useState(String(Math.min(now.getDate() + 3, daysInMonth(now.getFullYear(), now.getMonth() + 1))));
  const [dueMonth, setDueMonth] = useState(String(now.getMonth() + 1));

  const year = now.getFullYear();
  const monthNum = Number(dueMonth) || now.getMonth() + 1;
  const maxDay = daysInMonth(year, monthNum);
  const dayNum = Math.min(Number(dueDay) || 1, maxDay);

  return (
    <div className={detailStyles.payStep}>
      <div className={detailStyles.payStepTabs}>
        <button
          type="button"
          className={mode === "pay" ? detailStyles.payStepTabOn : detailStyles.payStepTab}
          onClick={() => setMode(mode === "pay" ? null : "pay")}
        >
          {t("orders.payNow")}
        </button>
        <button
          type="button"
          className={mode === "later" ? detailStyles.payStepTabOn : detailStyles.payStepTab}
          onClick={() => setMode(mode === "later" ? null : "later")}
        >
          {t("orders.payLater")}
        </button>
      </div>

      {mode === "pay" && canPay ? (
        <form action={payAction} className={detailStyles.payFormCompact}>
          <input type="hidden" name="orderId" value={orderId} />
          <IdempotencyField prefix={`pay-step-${orderId}`} />
          <div className={detailStyles.payFormRow}>
            <input
              name="amount"
              defaultValue={debtDefault}
              className="ui-input"
              inputMode="decimal"
              placeholder={t("orders.payAmountReceived")}
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

      {mode === "later" ? (
        <form action={payLaterAction} className={detailStyles.payFormCompact}>
          <input type="hidden" name="id" value={orderId} />
          <input type="hidden" name="day" value={String(dayNum)} />
          <input type="hidden" name="month" value={String(monthNum)} />
          <p className={detailStyles.payLaterLabel}>{t("orders.payLaterDate")}</p>
          <div className={detailStyles.payFormRow}>
            <FormField label={t("orders.dueDay")} className={detailStyles.compactField}>
              <select className="ui-input" value={String(dayNum)} onChange={(e) => setDueDay(e.target.value)}>
                {Array.from({ length: maxDay }, (_, i) => i + 1).map((d) => (
                  <option key={d} value={d}>{d}</option>
                ))}
              </select>
            </FormField>
            <FormField label={t("orders.dueMonth")} className={detailStyles.compactField}>
              <select className="ui-input" value={String(monthNum)} onChange={(e) => setDueMonth(e.target.value)}>
                {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => (
                  <option key={m} value={m}>{m}</option>
                ))}
              </select>
            </FormField>
          </div>
          <PendingButton className="ui-btn-secondary min-h-[40px] w-full" pendingLabel={t("common.sending")}>
            {t("orders.payLaterSave")}
          </PendingButton>
        </form>
      ) : null}
    </div>
  );
}
