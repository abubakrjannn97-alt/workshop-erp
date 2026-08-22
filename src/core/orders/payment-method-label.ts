import type { PaymentCard } from "@core/config/payment-cards";

function cardNameById(cards: PaymentCard[], cardId: string) {
  return cards.find((c) => c.id === cardId)?.name ?? null;
}

function cardIdFromComment(comment: string | null | undefined): string | null {
  if (!comment?.startsWith("card:")) return null;
  return comment.slice(5).split("|")[0]?.trim() || null;
}

export function formatPaymentMethodLabel(
  method: string | null | undefined,
  cards: PaymentCard[],
  t: (key: string) => string,
  comment?: string | null,
): string {
  if (method?.startsWith("card:")) {
    const name = cardNameById(cards, method.slice(5));
    if (name) return name;
  }

  const commentCardId = cardIdFromComment(comment);
  if (commentCardId) {
    const name = cardNameById(cards, commentCardId);
    if (name) return name;
  }

  if (!method) return comment?.trim() || "—";

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
  const parts = active.map((p) => formatPaymentMethodLabel(p.method, cards, t, p.comment));
  return [...new Set(parts)].join(" · ");
}
