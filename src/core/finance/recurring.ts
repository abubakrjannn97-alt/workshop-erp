import { prisma } from "@core/infrastructure/prisma";
import { LEDGER, postLedger } from "@core/finance/finance";
import { money } from "@core/shared/decimal";

export const OBLIGATION_INTERVAL = {
  MONTHLY: "MONTHLY",
} as const;

function periodKey(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

function sameMonth(a: Date, b: Date) {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth();
}

/** Post CASH_OUT + FUND_OUT for monthly obligations not yet posted this calendar month. */
export async function postDueRecurringObligations(userId: string, now = new Date()) {
  const rows = await prisma.obligation.findMany({
    where: { interval: OBLIGATION_INTERVAL.MONTHLY, status: "OPEN" },
  });
  const cash = await prisma.cashAccount.findUnique({ where: { code: "CASH" } });
  const opex = await prisma.financialFund.findUnique({ where: { code: "OPEX" } });
  const category = await prisma.expenseCategory.findFirst({
    where: { fundCode: "OPEX", archivedAt: null },
    orderBy: { isSystem: "desc" },
  });
  if (!cash) throw new Error("Касса CASH не найдена.");

  const postedIds: string[] = [];
  for (const row of rows) {
    if (row.lastPostedAt && sameMonth(row.lastPostedAt, now)) continue;
    const key = `obl-${row.id}-${periodKey(now)}`;
    await prisma.$transaction(async (tx) => {
      await postLedger(tx, {
        type: LEDGER.CASH_OUT,
        amount: money(row.amount),
        accountId: cash.id,
        categoryId: category?.id,
        fundId: opex?.id,
        relatedType: "obligation",
        relatedId: row.id,
        comment: `Регулярный расход: ${row.name}`,
        createdById: userId,
        idempotencyKey: `${key}-cash`,
      });
      if (opex) {
        await postLedger(tx, {
          type: LEDGER.FUND_OUT,
          amount: money(row.amount),
          fundId: opex.id,
          categoryId: category?.id,
          relatedType: "obligation",
          relatedId: row.id,
          comment: `Регулярный расход: ${row.name}`,
          createdById: userId,
          idempotencyKey: `${key}-fund`,
        });
      }
      const nextDue = new Date(now);
      nextDue.setMonth(nextDue.getMonth() + 1);
      await tx.obligation.update({
        where: { id: row.id },
        data: { lastPostedAt: now, dueAt: nextDue },
      });
    });
    postedIds.push(row.id);
  }
  return { posted: postedIds.length, ids: postedIds };
}
