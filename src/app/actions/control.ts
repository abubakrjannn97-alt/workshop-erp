"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@core/infrastructure/prisma";
import { requirePermission, requireSession } from "@core/auth/authz";
import { writeAudit } from "@core/control/audit";
import { D, money } from "@core/shared/decimal";
import { canSelfApprove, notifyRoles, queueApproval } from "@core/control/control";
import { executeApprovalDecision } from "@core/control/approval-decision";
import { cashDelta } from "@core/finance/finance";

export async function decideApproval(formData: FormData) {
  const session = await requirePermission("approvals.decide");
  const id = String(formData.get("id") ?? "");
  const decision = String(formData.get("decision") ?? "");
  if (decision !== "APPROVED" && decision !== "REJECTED") return { error: "Решение." };

  const result = await executeApprovalDecision({
    approvalId: id,
    decision,
    decidedById: session.user.id,
  });
  if (result.error) return result;

  revalidatePath("/settings/approvals");
  revalidatePath("/");
  return { ok: true };
}

export async function openCashShift(formData: FormData) {
  const session = await requirePermission("finance.view");
  const accountId = String(formData.get("accountId") ?? "");
  const openingAmount = String(formData.get("openingAmount") ?? "");
  if (!accountId) return { error: "Касса." };
  const open = await prisma.cashShift.findFirst({ where: { accountId, status: "OPEN" } });
  if (open) return { error: "Смена по этой кассе уже открыта." };
  await prisma.cashShift.create({
    data: {
      accountId,
      openedById: session.user.id,
      openingAmount: money(openingAmount || "0"),
      status: "OPEN",
    },
  });
  revalidatePath("/finance");
  revalidatePath("/", "layout");
  return { ok: true };
}

export async function closeCashShift(formData: FormData) {
  const session = await requirePermission("finance.view");
  const id = String(formData.get("id") ?? "");
  const actual = String(formData.get("closingActual") ?? "");
  const comment = String(formData.get("comment") ?? "").trim();
  const shift = await prisma.cashShift.findUnique({ where: { id } });
  if (!shift || shift.status !== "OPEN") return { error: "Смена не открыта." };
  if (!/^\d+(\.\d{1,4})?$/.test(actual)) return { error: "Фактический остаток." };

  const entries = await prisma.ledgerEntry.findMany({
    where: { status: "POSTED", createdAt: { gte: shift.openedAt } },
  });
  const movement = entries.reduce((s, e) => s.add(cashDelta(e, shift.accountId)), D(0));
  const expected = D(String(shift.openingAmount)).add(movement);
  const shortage = expected.sub(actual);

  if (shortage.abs().gte("0.01") && !comment) {
    return { error: "Укажите причину расхождения." };
  }

  await prisma.cashShift.update({
    where: { id },
    data: {
      status: shortage.abs().gte("0.01") && !canSelfApprove(session.user.roleCode) ? "PENDING_CLOSE" : "CLOSED",
      closingExpected: money(expected),
      closingActual: money(actual),
      shortage: money(shortage),
      comment: comment || null,
      closedById: session.user.id,
      closedAt: new Date(),
    },
  });

  if (shortage.abs().gte("0.01")) {
    await notifyRoles(["owner", "director"], {
      type: "cash_shortage",
      title: "Недостача / излишек кассы",
      body: `Ожидалось ${money(expected)}, факт ${money(actual)}, разница ${money(shortage)}.`,
      entityType: "cash_shift",
      entityId: id,
    });
    if (!canSelfApprove(session.user.roleCode)) {
      await queueApproval({
        type: "CASH_SHORTAGE",
        title: `Контроль кассы: разница ${money(shortage)}`,
        reason: comment,
        entityType: "cash_shift",
        entityId: id,
        payload: { id },
        requestedById: session.user.id,
      });
    }
  }
  revalidatePath("/finance");
  revalidatePath("/", "layout");
  return { ok: true };
}

export async function closePeriod(formData: FormData) {
  const session = await requirePermission("approvals.decide");
  const year = Number(formData.get("year"));
  const month = Number(formData.get("month"));
  if (!year || !month) return { error: "Укажите период." };
  await prisma.accountingPeriod.upsert({
    where: { year_month: { year, month } },
    update: { status: "CLOSED", closedById: session.user.id, closedAt: new Date() },
    create: { year, month, status: "CLOSED", closedById: session.user.id, closedAt: new Date() },
  });
  await writeAudit({
    userId: session.user.id,
    action: "period.close",
    entityType: "accounting_period",
    newValue: { year, month },
  });
  revalidatePath("/settings");
  return { ok: true };
}

export async function markNotificationsRead() {
  const session = await requireSession();
  await prisma.notification.updateMany({
    where: { userId: session.user.id, readAt: null },
    data: { readAt: new Date() },
  });
  revalidatePath("/");
  return { ok: true };
}
