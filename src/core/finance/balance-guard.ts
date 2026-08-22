import { prisma, type PrismaDb, type PrismaTx } from "@core/infrastructure/prisma";
import { D, moneyDisplay } from "@core/shared/decimal";
import { loadPaymentCards } from "@core/config/payment-cards";
import { buildFinanceMoneyCards } from "@core/finance/finance-summary";
import { cashDelta } from "@core/finance/finance";

type Tx = PrismaDb | PrismaTx;

function parseCardIdFromComment(comment: string | null | undefined): string | null {
  if (!comment?.startsWith("card:")) return null;
  return comment.slice(5).split("|")[0]?.trim() || null;
}

export async function loadBalanceContext(client: Tx = prisma) {
  const [accounts, entries, payments, paymentCards, payrollPayouts, purchasePayments] = await Promise.all([
    client.cashAccount.findMany({ where: { archivedAt: null }, orderBy: { code: "asc" } }),
    client.ledgerEntry.findMany({ where: { status: "POSTED" } }),
    client.payment.findMany({ select: { id: true, amount: true, method: true, reversesId: true } }),
    loadPaymentCards(),
    client.payrollPayout.findMany({ select: { amount: true, comment: true } }),
    client.purchasePayment.findMany({ select: { amount: true, comment: true } }),
  ]);

  const cashBalances = accounts.map((a) => ({
    ...a,
    balance: entries.reduce((s, e) => s.add(cashDelta(e, a.id)), D(0)),
  }));

  const moneyCards = buildFinanceMoneyCards({
    cashBalances,
    paymentCards,
    payments,
    accountLabel: (_code, name) => name,
  });

  const cardBalanceById = new Map<string, ReturnType<typeof D>>();
  for (const card of paymentCards.filter((c) => c.isActive)) {
    const row = moneyCards.find((m) => m.id === card.id || m.label === card.name);
    if (row) {
      cardBalanceById.set(card.id, D(row.amountDisplay.replace(/\s/g, "")));
    }
  }

  return { cashBalances, paymentCards, cardBalanceById, accounts };
}

export function accountBalance(
  cashBalances: { id: string; code: string; balance: ReturnType<typeof D> }[],
  code: string,
) {
  return cashBalances.find((a) => a.code === code)?.balance ?? D(0);
}

export function insufficientFundsMessage(label: string, available: ReturnType<typeof D>, need: ReturnType<typeof D>) {
  return `На «${label}» не хватает средств: доступно ${moneyDisplay(available)} с, нужно ${moneyDisplay(need)} с.`;
}

export async function assertOutboundPayment(input: {
  cashAmount?: ReturnType<typeof D>;
  cardId?: string;
  cardAmount?: ReturnType<typeof D>;
  client?: Tx;
}): Promise<{ ok: true } | { error: string }> {
  const cashAmount = input.cashAmount ?? D(0);
  const cardAmount = input.cardAmount ?? D(0);
  if (!cashAmount.gt(0) && !cardAmount.gt(0)) return { ok: true };

  const ctx = await loadBalanceContext(input.client ?? prisma);

  if (cashAmount.gt(0)) {
    const cash = accountBalance(ctx.cashBalances, "CASH");
    if (cash.lt(cashAmount)) {
      return { error: insufficientFundsMessage("Касса", cash, cashAmount) };
    }
  }

  if (cardAmount.gt(0)) {
    if (!input.cardId) return { error: "Выберите карту для оплаты." };
    const card = ctx.paymentCards.find((c) => c.id === input.cardId);
    const available = ctx.cardBalanceById.get(input.cardId) ?? D(0);
    if (available.lt(cardAmount)) {
      return { error: insufficientFundsMessage(card?.name ?? "Карта", available, cardAmount) };
    }
  }

  return { ok: true };
}

export function purchasePaymentComment(method: string | null, note: string) {
  if (method?.startsWith("card:")) return `${method}|${note}`;
  return note;
}

export function payrollPayoutComment(cardId: string, userComment?: string) {
  return userComment ? `card:${cardId}|${userComment}` : `card:${cardId}`;
}
