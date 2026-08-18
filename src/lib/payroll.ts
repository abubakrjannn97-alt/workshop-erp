import type { Prisma } from "@prisma/client";
import { D, money, qty } from "@core/shared/decimal";

type Tx = Prisma.TransactionClient;

export function periodKey(date = new Date()) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}

export function periodRange(key: string) {
  const [y, m] = key.split("-").map(Number);
  const start = new Date(y, m - 1, 1);
  const end = new Date(y, m, 1);
  return { start, end };
}

export function percentForCount(
  tiers: { fromCount: number; toCount: number | null; percent: { toString(): string } }[],
  index: number,
) {
  const sorted = [...tiers].sort((a, b) => a.fromCount - b.fromCount);
  const hit = sorted.find((t) => index >= t.fromCount && (t.toCount == null || index <= t.toCount));
  return hit ? D(String(hit.percent)) : D(0);
}

export async function accrueProductionWage(
  tx: Tx,
  input: {
    userId: string;
    batchId: string;
    orderId: string;
    goodQty: string;
    rate: string;
  },
) {
  const qtyGood = D(input.goodQty);
  if (qtyGood.lte(0)) return null;
  const amount = qtyGood.mul(input.rate);
  return tx.payrollAccrual.create({
    data: {
      userId: input.userId,
      kind: "PRODUCTION",
      amount: money(amount),
      quantity: qty(qtyGood),
      batchId: input.batchId,
      orderId: input.orderId,
      periodKey: periodKey(),
      status: "ACCRUED",
      comment: `${qty(qtyGood)} × ${money(input.rate)} с/м²`,
    },
  });
}

export async function reverseCommissionForPayment(tx: Tx, paymentId: string) {
  await tx.payrollAccrual.updateMany({
    where: { paymentId, kind: "COMMISSION", status: "ACCRUED" },
    data: { status: "REVERSED" },
  });
}

export async function accrueSellerCommission(
  tx: Tx,
  input: {
    sellerId: string;
    orderId: string;
    paymentId: string;
    paidAmount: string;
    scheme: {
      commissionMode: string | null;
      commissionBase: string | null;
      tiers: { fromCount: number; toCount: number | null; percent: { toString(): string } }[];
    };
  },
) {
  if (input.scheme.commissionBase === "TOTAL") {
    /* база TOTAL считается с суммы заказа при полной оплате — здесь только PAID-доля */
  }
  const { start, end } = periodRange(periodKey());
  const monthOrders = await tx.order.findMany({
    where: {
      sellerId: input.sellerId,
      createdAt: { gte: start, lt: end },
      status: { code: { not: "CANCELLED" } },
    },
    orderBy: { createdAt: "asc" },
    select: { id: true },
  });
  const index = monthOrders.findIndex((o) => o.id === input.orderId) + 1 || monthOrders.length;
  const mode = input.scheme.commissionMode ?? "PROGRESSIVE";

  if (mode === "TIERED") {
    await tx.payrollAccrual.updateMany({
      where: {
        userId: input.sellerId,
        kind: "COMMISSION",
        periodKey: periodKey(),
        status: "ACCRUED",
      },
      data: { status: "REVERSED" },
    });
    const pct = percentForCount(input.scheme.tiers, monthOrders.length);
    const payments = await tx.payment.findMany({
      where: {
        order: { sellerId: input.sellerId, createdAt: { gte: start, lt: end } },
        reversesId: null,
        amount: { gt: 0 },
      },
    });
    for (const p of payments) {
      const reversed = await tx.payment.findFirst({ where: { reversesId: p.id } });
      if (reversed) continue;
      await tx.payrollAccrual.create({
        data: {
          userId: input.sellerId,
          kind: "COMMISSION",
          amount: money(D(String(p.amount)).mul(pct).div(100)),
          percent: money(pct),
          orderId: p.orderId,
          paymentId: p.id,
          periodKey: periodKey(),
          status: "ACCRUED",
          comment: `Итоговый уровень месяца: ${monthOrders.length} зак. → ${pct.toFixed(2)}%`,
        },
      });
    }
    return;
  }

  const pct = percentForCount(input.scheme.tiers, index);
  await tx.payrollAccrual.create({
    data: {
      userId: input.sellerId,
      kind: "COMMISSION",
      amount: money(D(input.paidAmount).mul(pct).div(100)),
      percent: money(pct),
      quantity: String(index),
      orderId: input.orderId,
      paymentId: input.paymentId,
      periodKey: periodKey(),
      status: "ACCRUED",
      comment: `Заказ ${index} в месяце → ${pct.toFixed(2)}% с оплаты`,
    },
  });
}

export async function commissionPercentNow(
  tx: Tx,
  sellerId: string,
  orderId: string,
  scheme: {
    commissionMode: string | null;
    tiers: { fromCount: number; toCount: number | null; percent: { toString(): string } }[];
  },
) {
  const { start, end } = periodRange(periodKey());
  const monthOrders = await tx.order.findMany({
    where: {
      sellerId,
      createdAt: { gte: start, lt: end },
      status: { code: { not: "CANCELLED" } },
    },
    orderBy: { createdAt: "asc" },
    select: { id: true },
  });
  const index = monthOrders.findIndex((o) => o.id === orderId) + 1 || monthOrders.length;
  const count = scheme.commissionMode === "TIERED" ? monthOrders.length : index;
  return percentForCount(scheme.tiers, count);
}
