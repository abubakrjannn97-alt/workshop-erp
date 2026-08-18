import type { Prisma } from "@prisma/client";
import { prisma } from "@core/infrastructure/prisma";
import { D, money } from "@core/shared/decimal";
import { assertPeriodOpen } from "@core/control/control";
import { SETTING_KEYS } from "@core/config/settings";

type Tx = Prisma.TransactionClient;

export const LEDGER = {
  CASH_IN: "CASH_IN",
  CASH_OUT: "CASH_OUT",
  TRANSFER: "TRANSFER",
  FUND_IN: "FUND_IN",
  FUND_OUT: "FUND_OUT",
  REVERSAL: "REVERSAL",
} as const;

export const FUND = {
  MATERIALS: "MATERIALS",
  LABOR: "LABOR",
  COMMISSION: "COMMISSION",
  OPEX: "OPEX",
  PROFIT: "PROFIT",
} as const;

async function existing(tx: Tx, key?: string | null) {
  if (!key) return null;
  return tx.ledgerEntry.findUnique({ where: { idempotencyKey: key } });
}

export async function postLedger(
  tx: Tx,
  data: {
    type: string;
    amount: string;
    accountId?: string | null;
    fromAccountId?: string | null;
    toAccountId?: string | null;
    fundId?: string | null;
    categoryId?: string | null;
    orderId?: string | null;
    paymentId?: string | null;
    relatedType?: string | null;
    relatedId?: string | null;
    reversesId?: string | null;
    comment?: string | null;
    idempotencyKey?: string | null;
    createdById?: string | null;
  },
) {
  const dup = await existing(tx, data.idempotencyKey);
  if (dup) return dup;
  if (data.type !== LEDGER.REVERSAL) await assertPeriodOpen();
  if (D(data.amount).lte(0)) throw new Error("Сумма проводки должна быть больше нуля.");
  return tx.ledgerEntry.create({
    data: {
      type: data.type,
      amount: money(data.amount),
      accountId: data.accountId ?? null,
      fromAccountId: data.fromAccountId ?? null,
      toAccountId: data.toAccountId ?? null,
      fundId: data.fundId ?? null,
      categoryId: data.categoryId ?? null,
      orderId: data.orderId ?? null,
      paymentId: data.paymentId ?? null,
      relatedType: data.relatedType ?? null,
      relatedId: data.relatedId ?? null,
      reversesId: data.reversesId ?? null,
      comment: data.comment ?? null,
      idempotencyKey: data.idempotencyKey ?? null,
      createdById: data.createdById ?? null,
      status: "POSTED",
    },
  });
}

export async function accountByCode(tx: Tx | typeof prisma, code: string) {
  const row = await tx.cashAccount.findUnique({ where: { code } });
  if (!row) throw new Error(`Касса ${code} не найдена.`);
  return row;
}

export async function fundByCode(tx: Tx | typeof prisma, code: string) {
  const row = await tx.financialFund.findUnique({ where: { code } });
  if (!row) throw new Error(`Фонд ${code} не найден.`);
  return row;
}

export function accountForMethod(method?: string | null) {
  if (method === "bank" || method === "card") return "BANK";
  return "CASH";
}

export async function postClientPayment(
  tx: Tx,
  input: {
    orderId: string;
    paymentId: string;
    amount: string;
    method?: string | null;
    orderTotal: string;
    materialCost: string | null;
    laborAmount?: string | null;
    commissionAmount?: string | null;
    userId: string;
    reverseOf?: string | null;
  },
) {
  const amount = D(input.amount);
  const sign = amount.lt(0);
  const abs = amount.abs();
  if (abs.lte(0)) return;
  const account = await accountByCode(tx, accountForMethod(input.method));
  const materials = await fundByCode(tx, FUND.MATERIALS);
  const profit = await fundByCode(tx, FUND.PROFIT);
  const laborFund = await tx.financialFund.findUnique({ where: { code: FUND.LABOR } });
  const commFund = await tx.financialFund.findUnique({ where: { code: FUND.COMMISSION } });
  const opexFund = await tx.financialFund.findUnique({ where: { code: FUND.OPEX } });
  const total = D(input.orderTotal);
  const mat = input.materialCost ? D(input.materialCost) : D(0);
  const share = total.gt(0) ? abs.div(total) : D(0);
  const toMaterials = DecimalMin(abs, mat.mul(share));
  let rest = abs.sub(toMaterials);
  const toLabor = DecimalMin(rest, D(input.laborAmount ?? "0").mul(share));
  rest = rest.sub(toLabor);
  const toCommission = DecimalMin(rest, D(input.commissionAmount ?? "0"));
  rest = rest.sub(toCommission);
  const opexRow = await tx.setting.findUnique({ where: { key: SETTING_KEYS.opexReservePercent } });
  const opexPct = D(typeof opexRow?.value === "string" ? opexRow.value : "0");
  const toOpex = DecimalMin(rest, abs.mul(opexPct).div(100));
  rest = rest.sub(toOpex);
  const toProfit = rest;
  const prefix = input.reverseOf ? `rev-${input.reverseOf}` : input.paymentId;

  if (sign) {
    await postLedger(tx, {
      type: LEDGER.CASH_OUT,
      amount: money(abs),
      accountId: account.id,
      orderId: input.orderId,
      paymentId: input.paymentId,
      comment: "Сторно оплаты клиента",
      idempotencyKey: `led-cash-${prefix}`,
      createdById: input.userId,
      reversesId: input.reverseOf ?? null,
    });
    const out = LEDGER.FUND_OUT;
    if (toMaterials.gt(0)) {
      await postLedger(tx, {
        type: out, amount: money(toMaterials), fundId: materials.id,
        orderId: input.orderId, paymentId: input.paymentId,
        idempotencyKey: `led-mat-${prefix}`, createdById: input.userId,
      });
    }
    if (toLabor.gt(0) && laborFund) {
      await postLedger(tx, {
        type: out, amount: money(toLabor), fundId: laborFund.id,
        orderId: input.orderId, paymentId: input.paymentId,
        idempotencyKey: `led-lab-${prefix}`, createdById: input.userId,
      });
    }
    if (toCommission.gt(0) && commFund) {
      await postLedger(tx, {
        type: out, amount: money(toCommission), fundId: commFund.id,
        orderId: input.orderId, paymentId: input.paymentId,
        idempotencyKey: `led-com-${prefix}`, createdById: input.userId,
      });
    }
    if (toOpex.gt(0) && opexFund) {
      await postLedger(tx, {
        type: out, amount: money(toOpex), fundId: opexFund.id,
        orderId: input.orderId, paymentId: input.paymentId,
        idempotencyKey: `led-opex-${prefix}`, createdById: input.userId,
      });
    }
    if (toProfit.gt(0)) {
      await postLedger(tx, {
        type: out, amount: money(toProfit), fundId: profit.id,
        orderId: input.orderId, paymentId: input.paymentId,
        idempotencyKey: `led-prf-${prefix}`, createdById: input.userId,
      });
    }
    return;
  }

  await postLedger(tx, {
    type: LEDGER.CASH_IN,
    amount: money(abs),
    accountId: account.id,
    orderId: input.orderId,
    paymentId: input.paymentId,
    comment: "Оплата клиента",
    idempotencyKey: `led-cash-${prefix}`,
    createdById: input.userId,
  });
  const inn = LEDGER.FUND_IN;
  if (toMaterials.gt(0)) {
    await postLedger(tx, {
      type: inn, amount: money(toMaterials), fundId: materials.id,
      orderId: input.orderId, paymentId: input.paymentId, comment: "Резерв сырья",
      idempotencyKey: `led-mat-${prefix}`, createdById: input.userId,
    });
  }
  if (toLabor.gt(0) && laborFund) {
    await postLedger(tx, {
      type: inn, amount: money(toLabor), fundId: laborFund.id,
      orderId: input.orderId, paymentId: input.paymentId, comment: "Резерв зарплаты производства",
      idempotencyKey: `led-lab-${prefix}`, createdById: input.userId,
    });
  }
  if (toCommission.gt(0) && commFund) {
    await postLedger(tx, {
      type: inn, amount: money(toCommission), fundId: commFund.id,
      orderId: input.orderId, paymentId: input.paymentId, comment: "Резерв комиссии продавца",
      idempotencyKey: `led-com-${prefix}`, createdById: input.userId,
    });
  }
  if (toOpex.gt(0) && opexFund) {
    await postLedger(tx, {
      type: inn, amount: money(toOpex), fundId: opexFund.id,
      orderId: input.orderId, paymentId: input.paymentId, comment: "Резерв постоянных расходов",
      idempotencyKey: `led-opex-${prefix}`, createdById: input.userId,
    });
  }
  if (toProfit.gt(0)) {
    await postLedger(tx, {
      type: inn, amount: money(toProfit), fundId: profit.id,
      orderId: input.orderId, paymentId: input.paymentId, comment: "Доступная прибыль",
      idempotencyKey: `led-prf-${prefix}`, createdById: input.userId,
    });
  }
}

function DecimalMin(a: ReturnType<typeof D>, b: ReturnType<typeof D>) {
  return a.lt(b) ? a : b;
}

export function cashDelta(entry: {
  type: string;
  amount: { toString(): string };
  accountId: string | null;
  fromAccountId: string | null;
  toAccountId: string | null;
}, accountId: string) {
  const amt = D(String(entry.amount));
  if (entry.type === LEDGER.REVERSAL) return D(0);
  if (entry.type === LEDGER.CASH_IN && entry.accountId === accountId) return amt;
  if (entry.type === LEDGER.CASH_OUT && entry.accountId === accountId) return amt.neg();
  if (entry.type === LEDGER.TRANSFER) {
    if (entry.toAccountId === accountId) return amt;
    if (entry.fromAccountId === accountId) return amt.neg();
  }
  return D(0);
}

export function fundDelta(entry: {
  type: string;
  amount: { toString(): string };
  fundId: string | null;
}, fundId: string) {
  if (entry.fundId !== fundId) return D(0);
  const amt = D(String(entry.amount));
  if (entry.type === LEDGER.FUND_IN) return amt;
  if (entry.type === LEDGER.FUND_OUT) return amt.neg();
  return D(0);
}
