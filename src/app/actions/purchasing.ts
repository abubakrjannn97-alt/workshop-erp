"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { prisma } from "@core/infrastructure/prisma";
import { requirePermission } from "@core/auth/authz";
import { writeAudit } from "@core/control/audit";
import { D, money, qty } from "@core/shared/decimal";
import { receiveMaterial } from "@core/inventory/stock";
import { accountByCode, FUND, fundByCode, LEDGER, postLedger } from "@core/finance/finance";
import { findRawWarehouse } from "@/core/config/resolve-warehouse";

async function nextNumber() {
  const last = await prisma.purchaseOrder.findFirst({ orderBy: { createdAt: "desc" } });
  const n = last ? Number(last.number.replace(/\D/g, "")) + 1 : 1;
  return `PO-${String(Number.isFinite(n) ? n : 1).padStart(4, "0")}`;
}

export async function createPurchaseOrder(formData: FormData) {
  const session = await requirePermission("purchasing.manage");
  const supplierId = String(formData.get("supplierId") ?? "");
  const comment = String(formData.get("comment") ?? "").trim();
  if (!supplierId) return { error: "Выберите поставщика." };

  const materialIds = formData.getAll("materialId").map(String);
  const quantities = formData.getAll("quantity").map(String);
  const unitPrices = formData.getAll("unitPrice").map(String);
  const items = materialIds
    .map((materialId, i) => ({ materialId, quantity: quantities[i], unitPrice: unitPrices[i] }))
    .filter((item) => item.materialId && item.quantity && item.unitPrice);

  if (items.length === 0) return { error: "Добавьте позиции." };
  for (const item of items) {
    const parsed = z
      .object({
        materialId: z.string().min(1),
        quantity: z.string().regex(/^\d+(\.\d{1,6})?$/),
        unitPrice: z.string().regex(/^\d+(\.\d{1,6})?$/),
      })
      .safeParse(item);
    if (!parsed.success) return { error: "Проверьте количества и цены." };
  }

  const total = items.reduce((sum, item) => sum.add(D(item.quantity).mul(item.unitPrice)), D(0));
  const order = await prisma.purchaseOrder.create({
    data: {
      number: await nextNumber(),
      supplierId,
      status: "REQUEST",
      total: money(total),
      comment: comment || null,
      createdById: session.user.id,
      items: {
        create: items.map((item) => ({
          materialId: item.materialId,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          amount: money(D(item.quantity).mul(item.unitPrice)),
        })),
      },
    },
  });

  await writeAudit({
    userId: session.user.id,
    action: "purchase.create",
    entityType: "purchase_order",
    entityId: order.id,
    newValue: { number: order.number, total: money(total) },
  });
  revalidatePath("/purchasing");
  return { ok: true, id: order.id };
}

export async function confirmPurchaseOrder(formData: FormData) {
  const session = await requirePermission("purchasing.manage");
  const id = String(formData.get("id") ?? "");
  const order = await prisma.purchaseOrder.findUnique({ where: { id } });
  if (!order || order.status !== "REQUEST") return { error: "Заявку нельзя подтвердить." };
  await prisma.purchaseOrder.update({
    where: { id },
    data: { status: "ORDERED", confirmedById: session.user.id, confirmedAt: new Date() },
  });
  await writeAudit({
    userId: session.user.id,
    action: "purchase.confirm",
    entityType: "purchase_order",
    entityId: id,
  });
  revalidatePath("/purchasing");
  revalidatePath(`/purchasing/${id}`);
  return { ok: true };
}

export async function receivePurchaseOrder(formData: FormData) {
  const session = await requirePermission("purchasing.receive");
  const id = String(formData.get("id") ?? "");
  const order = await prisma.purchaseOrder.findUnique({
    where: { id },
    include: { items: { include: { material: true } } },
  });
  if (!order || (order.status !== "ORDERED" && order.status !== "REQUEST" && order.status !== "PARTIAL")) {
    return { error: "Заказ нельзя принять." };
  }

  const raw = await findRawWarehouse();
  if (!raw) return { error: "Склад сырья не найден." };

  const receiveQtys = formData.getAll("receiveQty").map(String);
  const itemIds = formData.getAll("itemId").map(String);
  const hasPartialInput = receiveQtys.length > 0 && itemIds.length > 0;

  try {
    await prisma.$transaction(async (tx) => {
      let allFullyReceived = true;
      for (let idx = 0; idx < order.items.length; idx++) {
        const item = order.items[idx];
        const remaining = D(String(item.quantity)).sub(String(item.receivedQty));
        if (remaining.lte(0)) continue;

        let receiveNow = remaining;
        if (hasPartialInput) {
          const itemIdx = itemIds.indexOf(item.id);
          if (itemIdx === -1) { allFullyReceived = false; continue; }
          const raw = receiveQtys[itemIdx] ?? "";
          if (!raw || D(raw).lte(0)) { allFullyReceived = false; continue; }
          receiveNow = D(raw);
          if (receiveNow.gt(remaining)) {
            throw new Error(`Нельзя принять больше остатка (${qty(remaining)}) для ${item.material.name}.`);
          }
        }

        const newReceived = D(String(item.receivedQty)).add(receiveNow);
        if (newReceived.lt(item.quantity)) allFullyReceived = false;

        await receiveMaterial(
          {
            warehouseId: raw.id,
            materialId: item.materialId,
            quantity: qty(receiveNow),
            unitCost: qty(item.unitPrice),
            userId: session.user.id,
            reason: "Приход от поставщика",
            relatedType: "purchase_order",
            relatedId: order.id,
            idempotencyKey: `${order.id}:${item.id}:receive:${money(newReceived)}`,
          },
          tx,
        );
        await tx.purchaseItem.update({
          where: { id: item.id },
          data: { receivedQty: qty(newReceived) },
        });
        await tx.materialPriceHistory.updateMany({
          where: { materialId: item.materialId, validTo: null },
          data: { validTo: new Date() },
        });
        const packagePrice = D(String(item.unitPrice)).mul(item.material.packageWeight);
        await tx.materialPriceHistory.create({
          data: {
            materialId: item.materialId,
            packageWeight: item.material.packageWeight,
            packagePrice: money(packagePrice),
            unitPrice: qty(item.unitPrice),
            createdById: session.user.id,
          },
        });
        await tx.material.update({
          where: { id: item.materialId },
          data: { packagePrice: money(packagePrice) },
        });
      }
      const nextStatus = allFullyReceived ? "POSTED" : "PARTIAL";
      await tx.purchaseOrder.update({
        where: { id },
        data: {
          status: nextStatus,
          ...(allFullyReceived ? { receivedById: session.user.id, receivedAt: new Date() } : {}),
        },
      });
    });
  } catch (error) {
    return { error: error instanceof Error ? error.message : "Ошибка приёмки." };
  }

  await writeAudit({
    userId: session.user.id,
    action: "purchase.receive",
    entityType: "purchase_order",
    entityId: id,
  });
  revalidatePath("/purchasing");
  revalidatePath(`/purchasing/${id}`);
  revalidatePath("/warehouse");
  revalidatePath("/materials");
  return { ok: true };
}

export async function registerPurchasePayment(formData: FormData) {
  const session = await requirePermission("purchasing.manage");
  const id = String(formData.get("id") ?? "");
  const amountRaw = String(formData.get("amount") ?? "");
  const method = String(formData.get("method") ?? "") || null;
  const parsed = z.string().regex(/^\d+(\.\d{1,4})?$/).safeParse(amountRaw);
  if (!parsed.success) return { error: "Сумма оплаты некорректна." };

  const order = await prisma.purchaseOrder.findUnique({ where: { id } });
  if (!order) return { error: "Заказ не найден." };
  const nextPaid = D(String(order.paidAmount)).add(amountRaw);
  if (nextPaid.gt(D(String(order.total)).mul("1.0001"))) {
    return { error: "Оплата больше суммы заказа." };
  }

  const { accountForMethod } = await import("@core/finance/finance");
  const accountCode = accountForMethod(method);

  await prisma.$transaction(async (tx) => {
    await tx.purchasePayment.create({
      data: {
        purchaseOrderId: id,
        amount: money(amountRaw),
        comment: String(formData.get("comment") ?? "") || null,
        createdById: session.user.id,
      },
    });
    await tx.purchaseOrder.update({
      where: { id },
      data: { paidAmount: money(nextPaid) },
    });
    const account = await accountByCode(tx, accountCode);
    const materials = await fundByCode(tx, FUND.MATERIALS);
    await postLedger(tx, {
      type: LEDGER.CASH_OUT,
      amount: money(amountRaw),
      accountId: account.id,
      relatedType: "purchase_order",
      relatedId: id,
      comment: `Оплата поставщику ${order.number}`,
      idempotencyKey: `po-pay-cash-${id}-${money(nextPaid)}`,
      createdById: session.user.id,
    });
    await postLedger(tx, {
      type: LEDGER.FUND_OUT,
      amount: money(amountRaw),
      fundId: materials.id,
      relatedType: "purchase_order",
      relatedId: id,
      comment: `Сырьё ${order.number}`,
      idempotencyKey: `po-pay-fund-${id}-${money(nextPaid)}`,
      createdById: session.user.id,
    });
  });

  await writeAudit({
    userId: session.user.id,
    action: "purchase.payment",
    entityType: "purchase_order",
    entityId: id,
    newValue: { amount: amountRaw },
  });
  revalidatePath(`/purchasing/${id}`);
  revalidatePath("/purchasing");
  revalidatePath("/finance");
  return { ok: true };
}

export async function cancelPurchaseOrder(formData: FormData) {
  const session = await requirePermission("purchasing.manage");
  const id = String(formData.get("id") ?? "");
  const order = await prisma.purchaseOrder.findUnique({ where: { id } });
  if (!order || order.status === "POSTED") {
    return { error: "Проведённый приход нельзя удалить. Используйте сторно складского движения." };
  }
  await prisma.purchaseOrder.update({ where: { id }, data: { status: "CANCELLED" } });
  await writeAudit({
    userId: session.user.id,
    action: "purchase.cancel",
    entityType: "purchase_order",
    entityId: id,
  });
  revalidatePath("/purchasing");
  return { ok: true };
}

export async function createPurchaseFromShortage(formData: FormData) {
  const session = await requirePermission("purchasing.manage");
  const supplierId = String(formData.get("supplierId") ?? "");
  const materialId = String(formData.get("materialId") ?? "");
  const quantity = String(formData.get("quantity") ?? "");
  if (!supplierId || !materialId) return { error: "Нужны поставщик и материал." };
  const material = await prisma.material.findUnique({ where: { id: materialId } });
  if (!material) return { error: "Материал не найден." };
  if (!quantity || D(quantity).lte(0)) return { error: "Количество должно быть больше 0." };
  const unitPrice = material.lastPurchasePrice ?? D(String(material.packagePrice)).div(material.packageWeight);
  formData.set("comment", "Заявка по дефициту / минимуму");
  formData.set("unitPrice", qty(unitPrice));
  void session;
  const result = await createPurchaseOrder(formData);
  if (result?.ok && result.id) {
    redirect(`/purchasing/${result.id}`);
  }
  return result;
}
