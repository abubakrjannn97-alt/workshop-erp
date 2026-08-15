import { prisma } from "@/lib/prisma";
import { D, moneyDisplay } from "@/lib/decimal";
import { cashDelta } from "@/lib/finance";
import type { CashShiftControlData } from "@/components/cash-shift-control";

const EMPTY: CashShiftControlData = { accounts: [], shifts: [] };

export async function getCashShiftBarData(): Promise<CashShiftControlData> {
  try {
    const accounts = await prisma.cashAccount.findMany({
      where: { archivedAt: null },
      orderBy: { code: "asc" },
    });
    if (accounts.length === 0) return EMPTY;

    const accountIds = accounts.map((account) => account.id);
    const [entries, shifts] = await Promise.all([
      prisma.ledgerEntry.findMany({
        where: {
          status: "POSTED",
          OR: [
            { accountId: { in: accountIds } },
            { fromAccountId: { in: accountIds } },
            { toAccountId: { in: accountIds } },
          ],
        },
        select: {
          type: true,
          amount: true,
          accountId: true,
          fromAccountId: true,
          toAccountId: true,
        },
      }),
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
  } catch (error) {
    console.error("getCashShiftBarData failed:", error);
    return EMPTY;
  }
}
