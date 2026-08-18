"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requirePermission, requireSession } from "@/lib/authz";
import { writeAudit } from "@core/control/audit";
import { D, money } from "@core/shared/decimal";
import { canSelfApprove, notifyRoles, queueApproval } from "@core/control/control";
import { cashDelta } from "@core/finance/finance";
import { writeOffMaterial } from "@core/inventory/stock";
import { confirmInventoryCount } from "@/app/actions/inventory";
import { transferCash } from "@/app/actions/finance";
import { publishRecipeVersion } from "@/app/actions/recipes";
import { cancelOrder, reversePayment } from "@/app/actions/orders";

export async function decideApproval(formData: FormData) {
  const session = await requirePermission("approvals.decide");
  const id = String(formData.get("id") ?? "");
  const decision = String(formData.get("decision") ?? "");
  const row = await prisma.approvalRequest.findUnique({ where: { id } });
  if (!row || row.status !== "PENDING") return { error: "Заявка не найдена." };
  if (decision !== "APPROVED" && decision !== "REJECTED") return { error: "Решение." };

  if (decision === "REJECTED") {
    await prisma.approvalRequest.update({
      where: { id },
      data: { status: "REJECTED", decidedById: session.user.id, decidedAt: new Date() },
    });
    await writeAudit({
      userId: session.user.id,
      action: "approval.reject",
      entityType: "approval",
      entityId: id,
    });
    revalidatePath("/settings/approvals");
    return { ok: true };
  }

  const payload = row.payload as Record<string, string>;
  const inner = new FormData();
  for (const [k, v] of Object.entries(payload)) {
    if (Array.isArray(v)) {
      for (const item of v) inner.append(k, String(item));
    } else if (v != null) {
      inner.set(k, String(v));
    }
  }
  inner.set("_approved", "1");

  let result: { error?: string; ok?: boolean } = { ok: true };
  if (row.type === "WRITE_OFF") result = await writeOffStockApproved(inner);
  else if (row.type === "TRANSFER") result = await transferCash(inner);
  else if (row.type === "INVENTORY") result = await confirmInventoryCount(inner);
  else if (row.type === "RECIPE") result = await publishRecipeVersion(inner);
  else if (row.type === "CANCEL_PAID") result = await cancelOrder(inner);
  else if (row.type === "REFUND") result = await reversePayment(inner);
  else if (row.type === "DISCOUNT") result = await applyApprovedDiscount(inner);
  else if (row.type === "CASH_SHORTAGE") result = { ok: true };
  else return { error: "Неизвестный тип заявки." };

  if (result.error) return result;

  await prisma.approvalRequest.update({
    where: { id },
    data: { status: "APPROVED", decidedById: session.user.id, decidedAt: new Date() },
  });
  await writeAudit({
    userId: session.user.id,
    action: "approval.approve",
    entityType: "approval",
    entityId: id,
    newValue: { type: row.type },
  });
  revalidatePath("/settings/approvals");
  revalidatePath("/");
  return { ok: true };
}

async function writeOffStockApproved(formData: FormData) {
  const warehouseId = String(formData.get("warehouseId") ?? "");
  const materialId = String(formData.get("materialId") ?? "");
  const quantity = String(formData.get("quantity") ?? "");
  const reason = String(formData.get("reason") ?? "");
  const comment = String(formData.get("comment") ?? "") || undefined;
  try {
    await writeOffMaterial({
      warehouseId,
      materialId,
      quantity,
      reason,
      comment,
      userId: String(formData.get("userId") ?? ""),
      idempotencyKey: String(formData.get("idempotencyKey") ?? `appr-wo-${materialId}-${quantity}`),
    });
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Списание не выполнено." };
  }
  return { ok: true };
}

async function applyApprovedDiscount(formData: FormData) {
  const orderId = String(formData.get("orderId") ?? "");
  const discountPercent = String(formData.get("discountPercent") ?? "0");
  const order = await prisma.order.findUnique({ where: { id: orderId } });
  if (!order) return { error: "Заказ не найден." };
  const discountAmount = D(String(order.subtotal)).mul(discountPercent).div(100);
  const total = D(String(order.subtotal)).sub(discountAmount);
  await prisma.order.update({
    where: { id: orderId },
    data: {
      discountPercent: money(discountPercent),
      discountAmount: money(discountAmount),
      total: money(total),
    },
  });
  revalidatePath(`/orders/${orderId}`);
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

