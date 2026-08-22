"use client";

import { moneyDisplay } from "@core/shared/decimal";
import type { PaymentCard } from "@core/config/payment-cards";
import { createT, type Locale } from "@core/shared/i18n/i18n";
import { formatOrderPaidStatus, formatPaymentLegsSummary } from "@core/orders/payment-breakdown";
import { formatPaymentMethodLabel } from "@core/orders/payment-method-label";
import detailStyles from "./order-detail.module.css";

type PayRow = {
  id: string;
  amount: string;
  method: string | null;
  comment: string | null;
  createdAt: string;
  reversesId: string | null;
};

export function OrderPaymentBreakdown({
  locale,
  orderTotal,
  paidAmount,
  payments,
  cards,
  loc,
}: {
  locale: Locale;
  orderTotal: string;
  paidAmount: string;
  payments: PayRow[];
  cards: PaymentCard[];
  loc: string;
}) {
  const t = createT(locale);
  const active = payments.filter((p) => !p.reversesId && !payments.some((x) => x.reversesId === p.id));
  if (active.length === 0 && moneyDisplay(paidAmount) === "0") return null;

  const summary = formatOrderPaidStatus(payments, cards, t, orderTotal, paidAmount);
  const legs = formatPaymentLegsSummary(payments, cards, t);

  return (
    <section className={detailStyles.sectionPanel}>
      <h2 className={detailStyles.sectionTitle}>{t("orders.paymentTitle")}</h2>
      <p className={detailStyles.paymentSummary}>{summary}</p>
      {active.length > 0 ? (
        <ul className={detailStyles.payBreakdownList}>
          {active.map((p) => (
            <li key={p.id} className={detailStyles.payBreakdownItem}>
              <span className={detailStyles.payBreakdownAmount}>{moneyDisplay(p.amount)} с</span>
              <span className={detailStyles.payBreakdownMethod}>
                {formatPaymentMethodLabel(p.method, cards, t, p.comment)}
              </span>
              <span className={detailStyles.payBreakdownDate}>
                {new Date(p.createdAt).toLocaleDateString(loc, {
                  day: "2-digit",
                  month: "2-digit",
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </span>
            </li>
          ))}
        </ul>
      ) : null}
      {active.length > 1 ? <p className={detailStyles.sectionNote}>{legs}</p> : null}
    </section>
  );
}
