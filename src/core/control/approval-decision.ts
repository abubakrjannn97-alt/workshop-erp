import { prisma } from "@core/infrastructure/prisma";
import { writeAudit } from "@core/control/audit";
import { D, money, qty } from "@core/shared/decimal";
import { writeOffMaterial, releaseMaterial, adjustToActual } from "@core/inventory/stock";
import { findRawWarehouse } from "@core/config/resolve-warehouse";
import { ORDER_STATUS, paymentStatusOf } from "@core/orders/orders";
import { notifyRoles } from "@core/control/control";
import { postClientPayment } from "@core/finance/finance";
import { laborAmountForLines } from "@core/payroll/product-labor";
import { reverseCommissionForPayment } from "@core/payroll/payroll";
import { requireWorkshopId } from "@core/workshop/workshop-context";

export type ApprovalDecision = "APPROVED" | "REJECTED";

export type ApprovalDecisionResult = { error?: string; ok?: boolean };

function payloadToFormData(payload: Record<string, unknown>): FormData {
  const form = new FormData();
  for (const [key, value] of Object.entries(payload)) {
    if (Array.isArray(value)) {
      for (const item of value) form.append(key, String(item));
    } else if (value != null) {
      form.set(key, String(value));
    }
  }
  return form;
}

export async function applyApprovedDiscount(formData: FormData): Promise<ApprovalDecisionResult> {
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
  return { ok: true };
}

async function executeWriteOff(payload: Record<string, unknown>, userId: string): Promise<ApprovalDecisionResult> {
  const warehouseId = String(payload.warehouseId ?? "");
  const materialId = String(payload.materialId ?? "");
  const quantity = String(payload.quantity ?? "");
  const reason = String(payload.reason ?? "");
  const comment = String(payload.comment ?? "") || undefined;
  try {
    await writeOffMaterial({
      warehouseId,
      materialId,
      quantity,
      reason,
      comment,
      userId: String(payload.userId ?? userId),
      idempotencyKey: String(payload.idempotencyKey ?? `appr-wo-${materialId}-${quantity}`),
    });
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Списание не выполнено." };
  }
  return { ok: true };
}

async function executeTransfer(_payload: Record<string, unknown>, _userId: string): Promise<ApprovalDecisionResult> {
  return { error: "Перевод между кассами отключён." };
}

async function executeInventory(payload: Record<string, unknown>, userId: string): Promise<ApprovalDecisionResult> {
  const id = String(payload.id ?? "");
  const reason = String(payload.reason ?? "").trim();
  if (!id || !reason) return { error: "Нужны документ и причина." };
  const count = await prisma.inventoryCount.findUnique({
    where: { id },
    include: { lines: true },
  });
  if (!count || count.status !== "DRAFT") return { error: "Инвентаризация не найдена или уже проведена." };
  const actuals = Array.isArray(payload.actualQty) ? payload.actualQty.map(String) : [];
  const lineIds = Array.isArray(payload.lineId) ? payload.lineId.map(String) : [];
  try {
    for (let i = 0; i < lineIds.length; i += 1) {
      const line = count.lines.find((l) => l.id === lineIds[i]);
      if (!line) continue;
      const actual = D(actuals[i] || "0");
      const diff = actual.sub(D(String(line.systemQty)));
      await prisma.inventoryCountLine.update({
        where: { id: line.id },
        data: {
          actualQty: qty(actual),
          difference: qty(diff),
          amount: money(diff.mul(D(String(line.unitCost)))),
        },
      });
      await adjustToActual({
        warehouseId: count.warehouseId,
        stockItemId: line.stockItemId,
        actualQty: qty(actual),
        userId,
        reason,
        relatedId: count.id,
        idempotencyKey: `${id}:${line.id}`,
      });
    }
    await prisma.inventoryCount.update({
      where: { id },
      data: { status: "CONFIRMED", reason, confirmedById: userId, confirmedAt: new Date() },
    });
  } catch (error) {
    return { error: error instanceof Error ? error.message : "Ошибка проведения." };
  }
  const shortageLines = await prisma.inventoryCountLine.findMany({ where: { inventoryCountId: id } });
  const missing = shortageLines.filter((l) => D(String(l.difference)).lt(0));
  if (missing.length > 0) {
    await notifyRoles(["owner", "director"], {
      type: "inventory_shortage",
      title: "Недостача при инвентаризации",
      body: `${missing.length} позиций, причина: ${reason}`,
      entityType: "inventory_count",
      entityId: id,
    });
  }
  return { ok: true };
}

async function executeCancelPaid(payload: Record<string, unknown>, userId: string): Promise<ApprovalDecisionResult> {
  const id = String(payload.id ?? "");
  const order = await prisma.order.findUnique({
    where: { id },
    include: { status: true, materials: true },
  });
  if (!order) return { error: "Заказ не найден." };
  if (order.status.code === ORDER_STATUS.CANCELLED) return { error: "Заказ уже отменён." };
  const cancelled = await prisma.orderStatus.findUniqueOrThrow({ where: { code: ORDER_STATUS.CANCELLED } });
  const raw = await findRawWarehouse();
  try {
    await prisma.$transaction(async (tx) => {
      if (raw) {
        for (const need of order.materials) {
          if (D(String(need.reservedQty)).lte(0)) continue;
          await releaseMaterial(
            {
              warehouseId: raw.id,
              materialId: need.materialId,
              quantity: qty(need.reservedQty),
              userId,
              relatedType: "order",
              relatedId: order.id,
              idempotencyKey: `order-release-${order.id}-${need.materialId}`,
            },
            tx,
          );
          await tx.orderMaterialNeed.update({
            where: { id: need.id },
            data: { reservedQty: "0" },
          });
        }
      }
      await tx.order.update({ where: { id }, data: { statusId: cancelled.id } });
    });
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Не удалось отменить." };
  }
  return { ok: true };
}

async function executeRecipe(payload: Record<string, unknown>, userId: string): Promise<ApprovalDecisionResult> {
  const productId = String(payload.productId ?? "");
  const comment = String(payload.comment ?? "").trim();
  if (!productId) return { error: "Нет изделия." };
  const materialIds = Array.isArray(payload.materialId) ? payload.materialId.map(String) : [];
  const quantities = Array.isArray(payload.quantity) ? payload.quantity.map(String) : [];
  const unitIds = Array.isArray(payload.unitId) ? payload.unitId.map(String) : [];
  const items = materialIds
    .map((materialId, index) => ({
      materialId,
      quantity: quantities[index] ?? "",
      unitId: unitIds[index] ?? "",
    }))
    .filter((item) => item.materialId && item.quantity && item.unitId);
  if (items.length === 0) return { error: "Добавьте хотя бы один компонент." };

  const product = await prisma.product.findUnique({ where: { id: productId } });
  if (!product) return { error: "Изделие не найдено." };
  const recipe = (await prisma.recipe.findUnique({ where: { productId } })) ?? (await prisma.recipe.create({ data: { productId } }));
  const current = await prisma.recipeVersion.findFirst({
    where: { recipeId: recipe.id },
    orderBy: { versionNumber: "desc" },
    include: { items: true },
  });
  const nextNumber = (current?.versionNumber ?? 0) + 1;
  const now = new Date();
  await prisma.$transaction(async (tx) => {
    await tx.recipeVersion.updateMany({
      where: { recipeId: recipe.id, validTo: null },
      data: { validTo: now },
    });
    await tx.recipeVersion.create({
      data: {
        recipeId: recipe.id,
        versionNumber: nextNumber,
        validFrom: now,
        comment: comment || null,
        createdById: userId,
        items: {
          create: items.map((item) => ({
            materialId: item.materialId,
            quantity: item.quantity,
            unitId: item.unitId,
          })),
        },
      },
    });
  });
  return { ok: true };
}

async function executeRefund(payload: Record<string, unknown>, userId: string): Promise<ApprovalDecisionResult> {
  const paymentId = String(payload.paymentId ?? "");
  const payment = await prisma.payment.findUnique({
    where: { id: paymentId },
    include: {
      reversedBy: true,
      order: { include: { items: { include: { product: true } } } },
    },
  });
  if (!payment) return { error: "Оплата не найдена." };
  if (payment.reversedBy) return { error: "Оплата уже сторнирована." };
  if (payment.reversesId) return { error: "Нельзя сторнировать сторно." };
  try {
  await prisma.$transaction(async (tx) => {
    const reversal = await tx.payment.create({
      data: {
        workshopId: requireWorkshopId(),
        orderId: payment.orderId,
        amount: money(D(String(payment.amount)).neg()),
        method: payment.method,
        comment: "Сторно оплаты",
        reversesId: payment.id,
        createdById: userId,
        idempotencyKey: `pay-rev-${payment.id}`,
      },
    });
    const payments = await tx.payment.findMany({ where: { orderId: payment.orderId } });
    const paid = payments.reduce((s, p) => s.add(String(p.amount)), D(0));
    await tx.order.update({
      where: { id: payment.orderId },
      data: { paidAmount: money(paid), paymentStatus: paymentStatusOf(payment.order.total, paid, true) },
    });
    const commSum = await tx.payrollAccrual.aggregate({
      where: { paymentId: payment.id, kind: "COMMISSION", status: "ACCRUED" },
      _sum: { amount: true },
    });
    await reverseCommissionForPayment(tx, payment.id);
    await postClientPayment(tx, {
      orderId: payment.orderId,
      paymentId: reversal.id,
      amount: money(D(String(payment.amount)).neg()),
      method: payment.method,
      orderTotal: String(payment.order.total),
      materialCost: payment.order.materialCost ? String(payment.order.materialCost) : null,
      laborAmount: laborAmountForLines(
        payment.order.items.map((item) => ({ quantity: item.quantity })),
      ),
      commissionAmount: commSum._sum.amount ? money(commSum._sum.amount) : "0",
      userId,
      reverseOf: payment.id,
    });
  });
  return { ok: true };
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Ошибка сторно." };
  }
}

async function executeApprovedPayload(
  type: string,
  payload: Record<string, unknown>,
  userId: string,
): Promise<ApprovalDecisionResult> {
  const form = payloadToFormData(payload);
  form.set("_approved", "1");
  if (type === "WRITE_OFF") return executeWriteOff(payload, userId);
  if (type === "TRANSFER") return executeTransfer(payload, userId);
  if (type === "INVENTORY") return executeInventory(payload, userId);
  if (type === "DISCOUNT") return applyApprovedDiscount(form);
  if (type === "CANCEL_PAID") return executeCancelPaid(payload, userId);
  if (type === "CASH_SHORTAGE") return { ok: true };
  if (type === "RECIPE") return executeRecipe(payload, userId);
  if (type === "REFUND") return executeRefund(payload, userId);
  return { error: "Неизвестный тип заявки." };
}

/** Core approval decision — testable without Next.js session. */
export async function executeApprovalDecision(input: {
  approvalId: string;
  decision: ApprovalDecision;
  decidedById: string;
}): Promise<ApprovalDecisionResult> {
  const row = await prisma.approvalRequest.findUnique({ where: { id: input.approvalId } });
  if (!row || row.status !== "PENDING") return { error: "Заявка не найдена." };

  // Atomically claim the approval to prevent double-execution
  const claimed = await prisma.approvalRequest.updateMany({
    where: { id: input.approvalId, status: "PENDING" },
    data: { status: input.decision === "REJECTED" ? "REJECTED" : "PROCESSING", decidedById: input.decidedById, decidedAt: new Date() },
  });
  if (claimed.count === 0) return { error: "Заявка уже обработана." };

  if (input.decision === "REJECTED") {
    await writeAudit({
      userId: input.decidedById,
      action: "approval.reject",
      entityType: "approval",
      entityId: input.approvalId,
    });
    return { ok: true };
  }

  const payload = row.payload as Record<string, unknown>;
  const result = await executeApprovedPayload(row.type, payload, input.decidedById);
  if (result.error) {
    // Rollback claim on failure
    await prisma.approvalRequest.update({
      where: { id: input.approvalId },
      data: { status: "PENDING", decidedById: null, decidedAt: null },
    });
    return result;
  }

  await prisma.approvalRequest.update({
    where: { id: input.approvalId },
    data: { status: "APPROVED" },
  });
  await writeAudit({
    userId: input.decidedById,
    action: "approval.approve",
    entityType: "approval",
    entityId: input.approvalId,
    newValue: { type: row.type },
  });
  return { ok: true };
}
