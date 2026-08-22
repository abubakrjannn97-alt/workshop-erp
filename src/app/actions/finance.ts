"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { prisma } from "@core/infrastructure/prisma";
import { requirePermission } from "@core/auth/authz";
import { writeAudit } from "@core/control/audit";
import { D, money } from "@core/shared/decimal";
import { accountByCode, FUND, LEDGER, postLedger } from "@core/finance/finance";
import { assertOutboundPayment, loadBalanceContext, insufficientFundsMessage } from "@core/finance/balance-guard";

function normalizeAmount(value: string) {
  return value.trim().replace(",", ".");
}

function moneyStr(value: string) {
  return z.string().regex(/^\d+(\.\d{1,4})?$/).safeParse(value).success;
}

export async function createExpense(formData: FormData) {
  const session = await requirePermission("finance.expense.create");
  const accountId = String(formData.get("accountId") ?? "");
  const categoryId = String(formData.get("categoryId") ?? "").trim();
  const amount = normalizeAmount(String(formData.get("amount") ?? ""));
  const idem = String(formData.get("idempotencyKey") ?? "") || null;
  if (!accountId) return { error: "Выберите кассу или счёт." };
  if (!categoryId) return { error: "Выберите категорию расхода." };
  if (!moneyStr(amount) || D(amount).lte(0)) return { error: "Сумма." };

  const category = await prisma.expenseCategory.findUnique({ where: { id: categoryId } });
  if (!category) return { error: "Категория не найдена." };
  const fund = await prisma.financialFund.findUnique({ where: { code: category.fundCode } });

  const ctx = await loadBalanceContext();
  const accountRow = ctx.cashBalances.find((a) => a.id === accountId);
  if (!accountRow) return { error: "Счёт не найден." };
  const need = D(amount);
  if (accountRow.balance.lt(need)) {
    return { error: insufficientFundsMessage(accountRow.name, accountRow.balance, need) };
  }

  await prisma.$transaction(async (tx) => {
    await postLedger(tx, {
      type: LEDGER.CASH_OUT,
      amount: money(amount),
      accountId,
      categoryId,
      fundId: fund?.id,
      comment: category.name,
      createdById: session.user.id,
      idempotencyKey: idem ? `${idem}-cash` : null,
    });
    if (fund) {
      await postLedger(tx, {
        type: LEDGER.FUND_OUT,
        amount: money(amount),
        fundId: fund.id,
        categoryId,
        comment: category.name,
        createdById: session.user.id,
        idempotencyKey: idem ? `${idem}-fund` : null,
      });
    }
  });

  await writeAudit({
    userId: session.user.id,
    action: "finance.expense",
    entityType: "ledger",
    newValue: { amount, category: category.code, accountId },
  });
  revalidatePath("/finance");
  revalidatePath("/finance/expenses");
  redirect("/finance/expenses");
}

/** Cash-account transfer removed from workshop UI — kept as stub so old callers fail safely. */
export async function transferCash(_formData: FormData) {
  return { error: "Перевод между кассами отключён." };
}

export async function createObligation(formData: FormData) {
  const session = await requirePermission("finance.expense.create");
  const name = String(formData.get("name") ?? "").trim();
  const amount = String(formData.get("amount") ?? "");
  const kind = String(formData.get("kind") ?? "other") || "other";
  const comment = String(formData.get("comment") ?? "").trim();
  const intervalRaw = String(formData.get("interval") ?? "").trim();
  const interval = intervalRaw === "MONTHLY" ? "MONTHLY" : null;
  if (!name) return { error: "Название обязательства." };
  if (!moneyStr(amount) || D(amount).lte(0)) return { error: "Сумма." };

  const row = await prisma.obligation.create({
    data: {
      kind,
      name,
      amount: money(amount),
      comment: comment || null,
      interval,
      createdById: session.user.id,
    },
  });
  await writeAudit({
    userId: session.user.id,
    action: "obligation.create",
    entityType: "obligation",
    entityId: row.id,
  });
  revalidatePath("/finance");
  return { ok: true };
}

export async function postRecurringObligations() {
  const session = await requirePermission("finance.expense.create");
  const { postDueRecurringObligations } = await import("@core/finance/recurring");
  const result = await postDueRecurringObligations(session.user.id);
  await writeAudit({
    userId: session.user.id,
    action: "obligation.recurring.post",
    entityType: "obligation",
    newValue: result,
  });
  revalidatePath("/finance");
  return { ok: true, ...result };
}

export async function createExpenseCategory(formData: FormData) {
  const session = await requirePermission("finance.expense.create");
  const name = String(formData.get("name") ?? "").trim();
  const code = String(formData.get("code") ?? "")
    .trim()
    .toUpperCase()
    .replace(/\s+/g, "_");
  const fundCode = String(formData.get("fundCode") ?? "OPEX");
  if (!name || !code) return { error: "Код и название." };
  await prisma.expenseCategory.upsert({
    where: { code },
    update: { name, fundCode },
    create: { code, name, fundCode, isSystem: false },
  });
  await writeAudit({
    userId: session.user.id,
    action: "finance.category",
    entityType: "expense_category",
    newValue: { code, name },
  });
  revalidatePath("/finance");
  return { ok: true };
}
