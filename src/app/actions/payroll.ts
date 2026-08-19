"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@core/infrastructure/prisma";
import { requirePermission } from "@core/auth/authz";
import { writeAudit } from "@core/control/audit";
import { D, money } from "@core/shared/decimal";
import { FUND, LEDGER, postLedger } from "@core/finance/finance";
import { periodKey } from "@core/payroll/payroll";

export async function assignPayScheme(formData: FormData) {
  const session = await requirePermission("users.edit");
  const userId = String(formData.get("userId") ?? "");
  const paySchemeId = String(formData.get("paySchemeId") ?? "") || null;
  const hiredAtRaw = String(formData.get("hiredAt") ?? "");
  await prisma.user.update({
    where: { id: userId },
    data: {
      paySchemeId,
      hiredAt: hiredAtRaw ? new Date(hiredAtRaw) : null,
    },
  });
  await writeAudit({
    userId: session.user.id,
    action: "employee.scheme",
    entityType: "user",
    entityId: userId,
    newValue: { paySchemeId, hiredAt: hiredAtRaw || null },
  });
  revalidatePath("/employees");
  revalidatePath(`/employees/${userId}`);
  return { ok: true };
}

export async function updatePayScheme(formData: FormData) {
  const session = await requirePermission("settings.edit");
  const id = String(formData.get("id") ?? "");
  const commissionMode = String(formData.get("commissionMode") ?? "") || null;
  const commissionBase = String(formData.get("commissionBase") ?? "") || null;
  const productionRate = String(formData.get("productionRate") ?? "");
  const salaryAmount = String(formData.get("salaryAmount") ?? "");
  await prisma.payScheme.update({
    where: { id },
    data: {
      commissionMode,
      commissionBase,
      productionRate: productionRate ? productionRate : null,
      salaryAmount: salaryAmount ? salaryAmount : null,
    },
  });
  const fromCounts = formData.getAll("fromCount").map(String);
  const toCounts = formData.getAll("toCount").map(String);
  const percents = formData.getAll("percent").map(String);
  if (fromCounts.length > 0) {
    await prisma.commissionTier.deleteMany({ where: { schemeId: id } });
    await prisma.commissionTier.createMany({
      data: fromCounts
        .map((from, i) => ({
          schemeId: id,
          fromCount: Number(from),
          toCount: toCounts[i] ? Number(toCounts[i]) : null,
          percent: percents[i] || "0",
        }))
        .filter((t) => Number.isFinite(t.fromCount)),
    });
  }
  await writeAudit({
    userId: session.user.id,
    action: "payscheme.update",
    entityType: "pay_scheme",
    entityId: id,
  });
  revalidatePath("/employees");
  return { ok: true };
}

export async function payEmployee(formData: FormData) {
  const session = await requirePermission("salary.approve");
  const userId = String(formData.get("userId") ?? "");
  const amount = String(formData.get("amount") ?? "");
  const accountId = String(formData.get("accountId") ?? "");
  const comment = String(formData.get("comment") ?? "").trim();
  if (!z.string().regex(/^\d+(\.\d{1,4})?$/).safeParse(amount).success || D(amount).lte(0)) {
    return { error: "Сумма выплаты." };
  }
  if (!accountId) return { error: "Выберите кассу." };

  const employee = await prisma.user.findUnique({ where: { id: userId } });
  if (!employee || employee.archivedAt) return { error: "Сотрудник не найден или архивирован." };

  const accrued = await prisma.payrollAccrual.aggregate({
    where: { userId, status: "ACCRUED" },
    _sum: { amount: true },
  });
  const paid = await prisma.payrollPayout.aggregate({
    where: { userId },
    _sum: { amount: true },
  });
  const debt = D(String(accrued._sum.amount ?? 0)).sub(paid._sum.amount ?? 0);
  if (D(amount).gt(debt)) return { error: `Долг по начислениям: ${money(debt)}.` };

  const laborFund = await prisma.financialFund.findUnique({ where: { code: FUND.LABOR } });
  const category = await prisma.expenseCategory.findUnique({ where: { code: "SALARY" } });

  const idempKey = `payout-${userId}-${money(debt)}-${money(amount)}`;
  await prisma.$transaction(async (tx) => {
    await tx.payrollPayout.create({
      data: {
        userId,
        amount: money(amount),
        accountId,
        periodKey: periodKey(),
        comment: comment || "Выплата зарплаты/комиссии",
        createdById: session.user.id,
      },
    });
    await postLedger(tx, {
      type: LEDGER.CASH_OUT,
      amount: money(amount),
      accountId,
      categoryId: category?.id,
      fundId: laborFund?.id,
      relatedType: "payroll",
      relatedId: userId,
      comment: comment || "Выплата сотруднику",
      idempotencyKey: `${idempKey}-cash`,
      createdById: session.user.id,
    });
    if (laborFund) {
      await postLedger(tx, {
        type: LEDGER.FUND_OUT,
        amount: money(amount),
        fundId: laborFund.id,
        categoryId: category?.id,
        relatedType: "payroll",
        relatedId: userId,
        idempotencyKey: `${idempKey}-fund`,
        createdById: session.user.id,
      });
    }
  });

  await writeAudit({
    userId: session.user.id,
    action: "payroll.payout",
    entityType: "user",
    entityId: userId,
    newValue: { amount },
  });
  revalidatePath("/employees");
  revalidatePath(`/employees/${userId}`);
  revalidatePath("/finance");
  return { ok: true };
}
