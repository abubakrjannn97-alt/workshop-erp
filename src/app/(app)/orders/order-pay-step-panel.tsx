"use client";

import { useState } from "react";
import { AppSelect } from "@/components/app-select";
import { IdempotencyField } from "@/components/idempotency-field";
import { PendingButton } from "@/components/pending-button";
import { PAYMENT_METHODS } from "@core/orders/order-constants";
import { createT, type Locale } from "@core/shared/i18n/i18n";
import { PayDueCalendar } from "./pay-due-calendar";
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
  const [dueDay, setDueDay] = useState(
    Math.min(now.getDate() + 3, daysInMonth(now.getFullYear(), now.getMonth() + 1)),
  );
  const [dueMonth, setDueMonth] = useState(now.getMonth() + 1);

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
          <input type="hidden" name="day" value={String(dueDay)} />
          <input type="hidden" name="month" value={String(dueMonth)} />
          <p className={detailStyles.payLaterLabel}>{t("orders.payLaterDate")}</p>
          <PayDueCalendar
            locale={locale}
            day={dueDay}
            month={dueMonth}
            onChange={(d, m) => {
              setDueDay(d);
              setDueMonth(m);
            }}
          />
          <PendingButton className="ui-btn-secondary min-h-[40px] w-full" pendingLabel={t("common.sending")}>
            {t("orders.payLaterSave")}
          </PendingButton>
        </form>
      ) : null}
    </div>
  );
}
