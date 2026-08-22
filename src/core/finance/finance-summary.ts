import { prisma } from "@core/infrastructure/prisma";
import { D } from "@core/shared/decimal";
import { loadPaymentCards, type PaymentCard } from "@core/config/payment-cards";
import { contributionAndNet } from "@core/finance/profit";
import { cashDelta, LEDGER, fundDelta } from "@core/finance/finance";
import { ORDER_STATUS } from "@core/orders/orders";

export type MoneyLocationCard = {
  id: string;
  label: string;
  amount: ReturnType<typeof D>;
  kind: "cash" | "card" | "bank";
  logoUrl?: string;
};

export async function fetchFinanceNetProfit() {
  const [orders, accruals, entries] = await Promise.all([
    prisma.order.findMany({
      where: { status: { code: { not: ORDER_STATUS.CANCELLED } } },
      select: { total: true, materialCost: true },
    }),
    prisma.payrollAccrual.groupBy({ by: ["kind"], where: { status: "ACCRUED" }, _sum: { amount: true } }),
    prisma.ledgerEntry.findMany({ where: { status: "POSTED" }, select: { type: true, amount: true, categoryId: true } }),
  ]);

  const sold = orders.reduce((s, o) => s.add(String(o.total)), D(0));
  const materialCost = orders.reduce((s, o) => s.add(String(o.materialCost ?? 0)), D(0));
  const labor = D(String(accruals.find((a) => a.kind === "PRODUCTION")?._sum.amount ?? 0));
  const commission = D(String(accruals.find((a) => a.kind === "COMMISSION")?._sum.amount ?? 0));
  const expenses = entries
    .filter((e) => e.type === LEDGER.CASH_OUT && e.categoryId)
    .reduce((s, e) => s.add(String(e.amount)), D(0));

  return contributionAndNet({
    revenue: sold,
    materialCost,
    labor,
    commission,
    fixedExpenses: expenses,
  }).net;
}

function activePayments(
  payments: { id: string; amount: unknown; method: string | null; reversesId: string | null }[],
) {
  return payments.filter((p) => !p.reversesId && !payments.some((x) => x.reversesId === p.id));
}

export function buildMoneyLocationCards(input: {
  cashBalances: { id: string; code: string; name: string; balance: ReturnType<typeof D> }[];
  paymentCards: PaymentCard[];
  payments: { id: string; amount: unknown; method: string | null; reversesId: string | null }[];
  accountLabel: (code: string, name: string) => string;
}): MoneyLocationCard[] {
  const out: MoneyLocationCard[] = [];
  const cashAcc = input.cashBalances.find((a) => a.code === "CASH");
  const bankAcc = input.cashBalances.find((a) => a.code === "BANK");
  const bankBalance = bankAcc?.balance ?? D(0);

  if (cashAcc && !cashAcc.balance.eq(0)) {
    out.push({
      id: cashAcc.id,
      label: input.accountLabel(cashAcc.code, cashAcc.name),
      amount: cashAcc.balance,
      kind: "cash",
    });
  }

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

  if (bankAcc && !bankBalance.eq(0)) {
    if (totalCardFlow.gt(0)) {
      for (const card of input.paymentCards) {
        const flow = cardFlow.get(card.id) ?? D(0);
        if (flow.lte(0)) continue;
        const share = flow.div(totalCardFlow).mul(bankBalance);
        if (share.eq(0)) continue;
        out.push({
          id: card.id,
          label: card.name,
          amount: share,
          kind: "card",
          logoUrl: card.logoUrl,
        });
      }
      if (genericBankFlow.gt(0)) {
        const share = genericBankFlow.div(totalCardFlow).mul(bankBalance);
        if (!share.eq(0)) {
          out.push({
            id: "bank-other",
            label: input.accountLabel("BANK", bankAcc.name),
            amount: share,
            kind: "bank",
          });
        }
      }
    } else {
      out.push({
        id: bankAcc.id,
        label: input.accountLabel(bankAcc.code, bankAcc.name),
        amount: bankBalance,
        kind: "bank",
      });
    }
  }

  return out;
}

export async function fetchFinanceDashboardData() {
  const [accounts, funds, entries, purchaseDebts, paymentCards, payments, netProfit] = await Promise.all([
    prisma.cashAccount.findMany({ where: { archivedAt: null }, orderBy: { code: "asc" } }),
    prisma.financialFund.findMany({ orderBy: { sortOrder: "asc" } }),
    prisma.ledgerEntry.findMany({ where: { status: "POSTED" }, orderBy: { createdAt: "desc" } }),
    prisma.purchaseOrder.findMany({ where: { status: { not: "CANCELLED" } }, include: { supplier: true } }),
    loadPaymentCards(),
    prisma.payment.findMany({ select: { id: true, amount: true, method: true, reversesId: true } }),
    fetchFinanceNetProfit(),
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
    netProfit,
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
