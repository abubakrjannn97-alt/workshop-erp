import { prisma } from "@core/infrastructure/prisma";
import { D, moneyDisplay } from "@core/shared/decimal";
import { loadPaymentCards, type PaymentCard } from "@core/config/payment-cards";
import { contributionAndNet } from "@core/finance/profit";
import { cashDelta, LEDGER, fundDelta } from "@core/finance/finance";
import { ORDER_STATUS } from "@core/orders/orders";
import { resolveOrderDateRange } from "@core/shared/order-period";

export type FinanceProfitPeriod = "today" | "week" | "month";

export type MoneyLocationCard = {
  id: string;
  label: string;
  amountDisplay: string;
  amountNegative: boolean;
  kind: "cash" | "card" | "bank";
};

export type FinancePeriodSnapshot = {
  netProfitDisplay: string;
  netNegative: boolean;
};

export type FinancePeriodSnapshots = Record<FinanceProfitPeriod, FinancePeriodSnapshot>;

function inRange(date: Date, from: Date | undefined, to: Date | undefined) {
  if (from && date < from) return false;
  if (to && date > to) return false;
  return true;
}

function netFromRows(
  orders: { total: unknown; materialCost: unknown; createdAt: Date }[],
  accruals: { kind: string; amount: unknown; createdAt: Date }[],
  entries: { type: string; amount: unknown; categoryId: string | null; createdAt: Date }[],
  from?: Date,
  to?: Date,
) {
  const sold = orders
    .filter((o) => inRange(o.createdAt, from, to))
    .reduce((s, o) => s.add(String(o.total)), D(0));
  const materialCost = orders
    .filter((o) => inRange(o.createdAt, from, to))
    .reduce((s, o) => s.add(String(o.materialCost ?? 0)), D(0));

  const scopedAccruals = accruals.filter((a) => inRange(a.createdAt, from, to));
  const labor = scopedAccruals
    .filter((a) => a.kind === "PRODUCTION")
    .reduce((s, a) => s.add(String(a.amount)), D(0));
  const commission = scopedAccruals
    .filter((a) => a.kind === "COMMISSION")
    .reduce((s, a) => s.add(String(a.amount)), D(0));

  const expenses = entries
    .filter((e) => inRange(e.createdAt, from, to) && e.type === LEDGER.CASH_OUT && e.categoryId)
    .reduce((s, e) => s.add(String(e.amount)), D(0));

  return contributionAndNet({
    revenue: sold,
    materialCost,
    labor,
    commission,
    fixedExpenses: expenses,
  }).net;
}

export async function fetchFinancePeriodSnapshots(): Promise<FinancePeriodSnapshots> {
  const todayRange = resolveOrderDateRange({ period: "today" });
  const weekRange = resolveOrderDateRange({ period: "week" });
  const monthRange = resolveOrderDateRange({ period: "month" });
  const from = monthRange.from!;
  const to = monthRange.to!;

  const [orders, accruals, entries] = await Promise.all([
    prisma.order.findMany({
      where: {
        status: { code: { not: ORDER_STATUS.CANCELLED } },
        createdAt: { gte: from, lte: to },
      },
      select: { total: true, materialCost: true, createdAt: true },
    }),
    prisma.payrollAccrual.findMany({
      where: { status: "ACCRUED", createdAt: { gte: from, lte: to } },
      select: { kind: true, amount: true, createdAt: true },
    }),
    prisma.ledgerEntry.findMany({
      where: { status: "POSTED", createdAt: { gte: from, lte: to } },
      select: { type: true, amount: true, categoryId: true, createdAt: true },
    }),
  ]);

  const periods: FinanceProfitPeriod[] = ["today", "week", "month"];
  const ranges = { today: todayRange, week: weekRange, month: monthRange };
  const out = {} as FinancePeriodSnapshots;

  for (const period of periods) {
    const range = ranges[period];
    const net = netFromRows(orders, accruals, entries, range.from, range.to);
    out[period] = {
      netProfitDisplay: moneyDisplay(net.abs()),
      netNegative: net.lt(0),
    };
  }

  return out;
}

export async function fetchFinanceNetProfit() {
  const monthRange = resolveOrderDateRange({ period: "month" });
  const [orders, accruals, entries] = await Promise.all([
    prisma.order.findMany({
      where: { status: { code: { not: ORDER_STATUS.CANCELLED } } },
      select: { total: true, materialCost: true, createdAt: true },
    }),
    prisma.payrollAccrual.findMany({
      where: { status: "ACCRUED" },
      select: { kind: true, amount: true, createdAt: true },
    }),
    prisma.ledgerEntry.findMany({
      where: { status: "POSTED" },
      select: { type: true, amount: true, categoryId: true, createdAt: true },
    }),
  ]);
  return netFromRows(orders, accruals, entries, monthRange.from, monthRange.to);
}

function activePayments(
  payments: { id: string; amount: unknown; method: string | null; reversesId: string | null }[],
) {
  return payments.filter((p) => !p.reversesId && !payments.some((x) => x.reversesId === p.id));
}

/** Касса + до 3 активных карт — всегда 4 карточки под чистой прибылью. */
export function buildFinanceMoneyCards(input: {
  cashBalances: { id: string; code: string; name: string; balance: ReturnType<typeof D> }[];
  paymentCards: PaymentCard[];
  payments: { id: string; amount: unknown; method: string | null; reversesId: string | null }[];
  accountLabel: (code: string, name: string) => string;
}): MoneyLocationCard[] {
  const cashAcc = input.cashBalances.find((a) => a.code === "CASH");
  const bankAcc = input.cashBalances.find((a) => a.code === "BANK");
  const bankBalance = bankAcc?.balance ?? D(0);
  const activeCards = input.paymentCards.filter((c) => c.isActive).slice(0, 3);

  const paid = activePayments(input.payments);
  const cardFlow = new Map<string, ReturnType<typeof D>>();
  let genericBankFlow = D(0);

  for (const p of paid) {
    const amt = D(String(p.amount));
    if (p.method?.startsWith("card:")) {
      const cardId = p.method.slice(5);
      cardFlow.set(cardId, (cardFlow.get(cardId) ?? D(0)).add(amt));
    } else if (p.method === "bank" || p.method === "card") {
      genericBankFlow = genericBankFlow.add(amt);
    }
  }

  const totalCardFlow = [...cardFlow.values()].reduce((s, v) => s.add(v), D(0)).add(genericBankFlow);

  const cardAmount = (cardId: string) => {
    if (activeCards.length === 0) return D(0);
    if (totalCardFlow.gt(0)) {
      const flow = cardFlow.get(cardId) ?? D(0);
      const genericShare =
        genericBankFlow.gt(0) && activeCards.length > 0
          ? genericBankFlow.div(totalCardFlow).div(activeCards.length)
          : D(0);
      return flow.div(totalCardFlow).mul(bankBalance).add(genericShare);
    }
    return bankBalance.div(activeCards.length);
  };

  const toCard = (id: string, label: string, amount: ReturnType<typeof D>, kind: MoneyLocationCard["kind"]) => ({
    id,
    label,
    amountDisplay: moneyDisplay(amount),
    amountNegative: amount.lt(0),
    kind,
  });

  const out: MoneyLocationCard[] = [
    toCard(
      cashAcc?.id ?? "cash",
      cashAcc ? input.accountLabel(cashAcc.code, cashAcc.name) : input.accountLabel("CASH", "Касса"),
      cashAcc?.balance ?? D(0),
      "cash",
    ),
  ];

  for (const card of activeCards) {
    out.push(toCard(card.id, card.name, cardAmount(card.id), "card"));
  }

  return out;
}

/** @deprecated use buildFinanceMoneyCards */
export function buildMoneyLocationCards(input: Parameters<typeof buildFinanceMoneyCards>[0]): MoneyLocationCard[] {
  return buildFinanceMoneyCards(input);
}

export async function fetchFinanceDashboardData() {
  const [accounts, funds, entries, purchaseDebts, paymentCards, payments, periodSnapshots] = await Promise.all([
    prisma.cashAccount.findMany({ where: { archivedAt: null }, orderBy: { code: "asc" } }),
    prisma.financialFund.findMany({ orderBy: { sortOrder: "asc" } }),
    prisma.ledgerEntry.findMany({ where: { status: "POSTED" }, orderBy: { createdAt: "desc" } }),
    prisma.purchaseOrder.findMany({ where: { status: { not: "CANCELLED" } }, include: { supplier: true } }),
    loadPaymentCards(),
    prisma.payment.findMany({ select: { id: true, amount: true, method: true, reversesId: true } }),
    fetchFinancePeriodSnapshots(),
  ]);

  const cashBalances = accounts.map((a) => ({
    ...a,
    balance: entries.reduce((s, e) => s.add(cashDelta(e, a.id)), D(0)),
  }));
  const fundBalances = funds.map((f) => ({
    ...f,
    balance: entries.reduce((s, e) => s.add(fundDelta(e, f.id)), D(0)),
  }));
  const allocated = fundBalances.reduce((s, f) => s.add(f.balance), D(0));
  const supplierDebt = purchaseDebts.reduce((s, o) => s.add(D(String(o.total)).sub(o.paidAmount)), D(0));

  return {
    periodSnapshots,
    cashBalances,
    fundBalances,
    allocated,
    supplierDebt,
    purchaseDebts,
    entries,
    paymentCards,
    payments,
  };
}
