import { moneyDisplay } from "@core/shared/decimal";
import type { PaymentCard } from "@core/config/payment-cards";
import { formatPaymentMethodLabel } from "@core/orders/payment-method-label";

type PayRow = {
  amount: string;
  method: string | null;
  comment: string | null;
  reversesId: string | null;
};

function activePayments(payments: PayRow[]) {
  return payments.filter((p) => !p.reversesId && !payments.some((x) => x.reversesId === p.id));
}

/** «500 с · DC Wallet + 500 с · Касса» */
export function formatPaymentLegsSummary(
  payments: PayRow[],
  cards: PaymentCard[],
  t: (key: string) => string,
): string {
  const active = activePayments(payments);
  if (active.length === 0) return "—";
  return active
    .map((p) => `${moneyDisplay(p.amount)} с · ${formatPaymentMethodLabel(p.method, cards, t, p.comment)}`)
    .join(" + ");
}

export function formatOrderPaidStatus(
  payments: PayRow[],
  cards: PaymentCard[],
  t: (key: string) => string,
  orderTotal: string,
  paidAmount: string,
): string {
  const active = activePayments(payments);
  const total = moneyDisplay(orderTotal);
  const paid = moneyDisplay(paidAmount);
  const legs = formatPaymentLegsSummary(payments, cards, t);

  if (active.length === 0) return t("orders.paymentNone");

  if (paid === total) {
    return t("orders.paymentFull").replace("{amount}", paid).replace("{legs}", legs);
  }

  return t("orders.paymentPartial")
    .replace("{paid}", paid)
    .replace("{total}", total)
    .replace("{legs}", legs);
}
