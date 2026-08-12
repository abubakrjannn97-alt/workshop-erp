"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/authz";
import { writeAudit } from "@/lib/audit";
import { D, money } from "@/lib/decimal";
import { LEDGER, postLedger } from "@/lib/finance";
import { canSelfApprove, queueApproval } from "@/lib/control";

function moneyStr(value: string) {
  return z.string().regex(/^\d+(\.\d{1,4})?$/).safeParse(value).success;
}

export async function createExpense(formData: FormData) {
  const session = await requirePermission("finance.expense.create");
  const accountId = String(formData.get("accountId") ?? "");
  const categoryId = String(formData.get("categoryId") ?? "");
  const amount = String(formData.get("amount") ?? "");
  const comment = String(formData.get("comment") ?? "").trim();
  if (!accountId || !categoryId) return { error: "Касса и категория обязательны." };
  if (!moneyStr(amount) || D(amount).lte(0)) return { error: "Сумма." };

  const category = await prisma.expenseCategory.findUnique({ where: { id: categoryId } });
  if (!category) return { error: "Категория не найдена." };
  const fund = await prisma.financialFund.findUnique({ where: { code: category.fundCode } });

  await prisma.$transaction(async (tx) => {
    await postLedger(tx, {
      type: LEDGER.CASH_OUT,
      amount: money(amount),
      accountId,
      categoryId,
      fundId: fund?.id,
      comment: comment || category.name,
      createdById: session.user.id,
    });
    if (fund) {
      await postLedger(tx, {
        type: LEDGER.FUND_OUT,
        amount: money(amount),
        fundId: fund.id,
        categoryId,
        comment: comment || category.name,
        createdById: session.user.id,
      });
    }
  });

  await writeAudit({
    userId: session.user.id,
    action: "finance.expense",
    entityType: "ledger",
    newValue: { amount, category: category.code },
  });
  revalidatePath("/finance");
  return { ok: true };
}

export async function transferCash(formData: FormData) {
  const session = await requirePermission("finance.transfer");
  const fromAccountId = String(formData.get("fromAccountId") ?? "");
  const toAccountId = String(formData.get("toAccountId") ?? "");
  const amount = String(formData.get("amount") ?? "");
  const comment = String(formData.get("comment") ?? "").trim();
  if (!fromAccountId || !toAccountId || fromAccountId === toAccountId) {
    return { error: "Выберите разные кассы." };
  }
  if (!moneyStr(amount) || D(amount).lte(0)) return { error: "Сумма." };

  if (!canSelfApprove(session.user.roleCode) && String(formData.get("_approved") ?? "") !== "1") {
    await queueApproval({
      type: "TRANSFER",
      title: `Финансовый перевод ${amount}`,
      reason: comment || undefined,
      entityType: "cash",
      payload: { fromAccountId, toAccountId, amount, comment },
      requestedById: session.user.id,
    });
    return { ok: true, pending: true };
  }

  await prisma.$transaction(async (tx) => {
    await postLedger(tx, {
      type: LEDGER.TRANSFER,
      amount: money(amount),
      fromAccountId,
      toAccountId,
      comment: comment || "Перевод между кассами",
      createdById: session.user.id,
    });
  });

  await writeAudit({
    userId: session.user.id,
    action: "finance.transfer",
    entityType: "ledger",
    newValue: { amount, fromAccountId, toAccountId },
  });
  revalidatePath("/finance");
  return { ok: true };
}

export async function createObligation(formData: FormData) {
  const session = await requirePermission("finance.expense.create");
  const name = String(formData.get("name") ?? "").trim();
  const amount = String(formData.get("amount") ?? "");
  const kind = String(formData.get("kind") ?? "other") || "other";
  const comment = String(formData.get("comment") ?? "").trim();
  if (!name) return { error: "Название обязательства." };
  if (!moneyStr(amount) || D(amount).lte(0)) return { error: "Сумма." };

  const row = await prisma.obligation.create({
    data: {
      kind,
      name,
      amount: money(amount),
      comment: comment || null,
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
