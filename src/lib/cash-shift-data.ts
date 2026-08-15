import { prisma } from "@/lib/prisma";
import { D, moneyDisplay } from "@/lib/decimal";
import { cashDelta } from "@/lib/finance";

export async function getCashShiftBarData() {
  const [accounts, entries, shifts] = await Promise.all([
    prisma.cashAccount.findMany({ where: { archivedAt: null }, orderBy: { code: "asc" } }),
    prisma.ledgerEntry.findMany({ where: { status: "POSTED" } }),
    prisma.cashShift.findMany({
      where: { status: { in: ["OPEN", "PENDING_CLOSE"] } },
      orderBy: { openedAt: "desc" },
    }),
  ]);

  const balances = new Map(
    accounts.map((account) => [
      account.id,
      moneyDisplay(entries.reduce((sum, entry) => sum.add(cashDelta(entry, account.id)), D(0))),
    ]),
  );

  return {
    accounts: accounts.map((account) => ({
      id: account.id,
      code: account.code,
      name: account.name,
      balance: balances.get(account.id) ?? "0.00",
    })),
    shifts: shifts.map((shift) => ({
      id: shift.id,
      accountId: shift.accountId,
      openingAmount: moneyDisplay(shift.openingAmount),
      openedAt: shift.openedAt.toISOString(),
      expectedBalance: balances.get(shift.accountId) ?? null,
    })),
  };
}
