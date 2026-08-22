import type { PaymentCard } from "@core/config/payment-cards";

export function formatPaymentMethodLabel(
  method: string | null | undefined,
  cards: PaymentCard[],
  t: (key: string) => string,
  comment?: string | null,
): string {
  if (!method) return comment?.trim() || "—";

  if (method.startsWith("card:")) {
    const cardId = method.slice(5);
    const card = cards.find((c) => c.id === cardId);
    if (card) {
      const tail = card.last4 ? ` ···${card.last4}` : "";
      return `${card.name}${tail}`;
    }
    return t("pay.method.card");
  }

  if (method === "mixed") return t("pay.method.mixed");
  if (method === "cash") return t("pay.method.cash");
  if (method === "bank") return t("pay.method.bank");
  if (method === "card") return t("pay.method.card");

  const known = t(`pay.method.${method}`);
  if (known !== `pay.method.${method}`) return known;
  return comment?.trim() || method;
}

export function formatOrderPaymentSummary(
  payments: { amount: string; method: string | null; comment: string | null; reversesId: string | null }[],
  cards: PaymentCard[],
  t: (key: string) => string,
): string {
  const active = payments.filter((p) => !p.reversesId && !payments.some((x) => x.reversesId === p.id));
  if (active.length === 0) return "—";
  const parts = active.map((p) => {
    const label = formatPaymentMethodLabel(p.method, cards, t, p.comment);
    return label;
  });
  return [...new Set(parts)].join(" · ");
}
