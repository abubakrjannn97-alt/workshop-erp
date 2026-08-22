"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { randomUUID } from "crypto";
import { z } from "zod";
import type { Prisma } from "@prisma/client";
import { prisma } from "@core/infrastructure/prisma";
import { requirePermission, hasPermission } from "@core/auth/authz";
import { writeAudit } from "@core/control/audit";
import { D, money, qty } from "@core/shared/decimal";
import { receiveMaterial } from "@core/inventory/stock";
import { accountByCode, accountForMethod, FUND, fundByCode, LEDGER, postLedger } from "@core/finance/finance";
import { loadPaymentCards } from "@core/config/payment-cards";
import { findRawWarehouse } from "@/core/config/resolve-warehouse";

async function nextNumber() {
  const last = await prisma.purchaseOrder.findFirst({ orderBy: { createdAt: "desc" } });
  const n = last ? Number(last.number.replace(/\D/g, "")) + 1 : 1;
  return `PO-${String(Number.isFinite(n) ? n : 1).padStart(4, "0")}`;
}

async function postPurchasePaymentInTx(
  tx: Prisma.TransactionClient,
  input: {
    orderId: string;
    orderNumber: string;
    amount: string;
    method: string | null;
    userId: string;
    idempotencySuffix: string;
    comment?: string | null;
  },
) {
  const order = await tx.purchaseOrder.findUniqueOrThrow({ where: { id: input.orderId } });
  const nextPaid = D(String(order.paidAmount)).add(input.amount);
  if (nextPaid.gt(D(String(order.total)).mul("1.0001"))) {
    throw new Error("Оплата больше суммы заказа.");
  }

  await tx.purchasePayment.create({
    data: {
      purchaseOrderId: input.orderId,
      amount: money(input.amount),
      comment: input.comment ?? null,
      createdById: input.userId,
    },
  });
  await tx.purchaseOrder.update({
    where: { id: input.orderId },
    data: { paidAmount: money(nextPaid) },
  });

  const account = await accountByCode(tx, accountForMethod(input.method));
  const materialsFund = await fundByCode(tx, FUND.MATERIALS);
  const suffix = input.idempotencySuffix;

  await postLedger(tx, {
    type: LEDGER.CASH_OUT,
    amount: money(input.amount),
    accountId: account.id,
    relatedType: "purchase_order",
    relatedId: input.orderId,
    comment: input.comment ?? `Оплата поставщику ${input.orderNumber}`,
    idempotencyKey: `po-pay-cash-${input.orderId}-${suffix}`,
    createdById: input.userId,
  });
  await postLedger(tx, {
    type: LEDGER.FUND_OUT,
    amount: money(input.amount),
    fundId: materialsFund.id,
    relatedType: "purchase_order",
    relatedId: input.orderId,
    comment: `Сырьё ${input.orderNumber}`,
    idempotencyKey: `po-pay-fund-${input.orderId}-${suffix}`,
    createdById: input.userId,
  });
}

function paymentMethodFromForm(payChannel: string, cardId: string) {
  if (payChannel === "card" && cardId) return `card:${cardId}`;
  return "cash";
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
          data: {
            packagePrice: money(packagePrice),
            lastPurchasePrice: qty(item.unitPrice),
            averagePurchasePrice: qty(item.unitPrice),
          },
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
  revalidatePath("/products");
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

  await prisma.$transaction(async (tx) => {
    await postPurchasePaymentInTx(tx, {
      orderId: id,
      orderNumber: order.number,
      amount: amountRaw,
      method,
      userId: session.user.id,
      idempotencySuffix: money(nextPaid),
      comment: String(formData.get("comment") ?? "") || null,
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

const intakeSchema = z.object({
  warehouseId: z.string().min(1),
  materialId: z.string().min(1),
  supplierId: z.string().min(1),
  quantity: z.string().regex(/^\d+(\.\d{1,6})?$/),
  unitCost: z.string().regex(/^\d+(\.\d{1,6})?$/),
  payMode: z.enum(["paid", "partial", "debt"]),
  payChannel: z.enum(["cash", "card", "split"]).optional(),
  cardId: z.string().optional(),
  cardAmount: z.string().optional(),
  cashAmount: z.string().optional(),
  paidAmount: z.string().optional(),
  comment: z.string().optional(),
});

export async function receiveSupplierIntake(formData: FormData) {
  const session = await requirePermission("inventory.receive");
  const canPay = hasPermission(session.user.permissions, session.user.roleCode, "purchasing.manage");

  const parsed = intakeSchema.safeParse({
    warehouseId: formData.get("warehouseId"),
    materialId: formData.get("materialId"),
    supplierId: formData.get("supplierId"),
    quantity: formData.get("quantity"),
    unitCost: formData.get("unitCost"),
    payMode: formData.get("payMode") ?? "paid",
    payChannel: String(formData.get("payChannel") ?? "") || undefined,
    cardId: String(formData.get("cardId") ?? "") || undefined,
    cardAmount: String(formData.get("cardAmount") ?? "") || undefined,
    cashAmount: String(formData.get("cashAmount") ?? "") || undefined,
    paidAmount: String(formData.get("paidAmount") ?? "") || undefined,
    comment: String(formData.get("comment") ?? "") || undefined,
  });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Проверьте поля." };

  const supplier = await prisma.supplier.findFirst({
    where: { id: parsed.data.supplierId, archivedAt: null },
  });
  if (!supplier) return { error: "Поставщик не найден." };

  const material = await prisma.material.findFirst({
    where: { id: parsed.data.materialId, archivedAt: null },
    include: { storageUnit: true },
  });
  if (!material) return { error: "Материал не найден." };

  const qtyVal = D(parsed.data.quantity);
  const unitCost = D(parsed.data.unitCost);
  if (qtyVal.lte(0) || unitCost.lt(0)) return { error: "Проверьте количество и цену." };

  const total = qtyVal.mul(unitCost);
  let payAmount = D(0);
  if (parsed.data.payMode === "paid") {
    payAmount = total;
  } else if (parsed.data.payMode === "partial") {
    if (!parsed.data.paidAmount || !/^\d+(\.\d{1,4})?$/.test(parsed.data.paidAmount)) {
      return { error: "Укажите сумму оплаты." };
    }
    payAmount = D(parsed.data.paidAmount);
    if (payAmount.lte(0) || payAmount.gte(total)) {
      return { error: "Частичная оплата должна быть больше 0 и меньше итога." };
    }
  }

  if (payAmount.gt(0) && !canPay) {
    return { error: "Нет прав на оплату поставщику. Выберите «В долг» или обратитесь к руководителю." };
  }

  const payChannel = parsed.data.payChannel ?? "cash";
  let cardPaid = D(parsed.data.cardAmount || "0");
  let cashPaid = D(parsed.data.cashAmount || "0");

  if (parsed.data.payMode !== "debt" && payAmount.gt(0)) {
    if (payChannel === "card") {
      cardPaid = payAmount;
      cashPaid = D(0);
    } else if (payChannel === "cash") {
      cardPaid = D(0);
      cashPaid = payAmount;
    } else if (payChannel === "split") {
      if (!cardPaid.plus(cashPaid).eq(payAmount)) {
        return { error: "Сумма на карту и наличными должна равняться оплате." };
      }
    }
    if (cardPaid.gt(0)) {
      const cards = await loadPaymentCards();
      if (!parsed.data.cardId || !cards.some((c) => c.id === parsed.data.cardId)) {
        return { error: "Выберите карту для оплаты." };
      }
    }
  } else {
    cardPaid = D(0);
    cashPaid = D(0);
  }

  const raw = await findRawWarehouse();
  if (!raw) return { error: "Склад сырья не найден." };

  const idempotencyKey = String(formData.get("idempotencyKey") ?? randomUUID()).trim() || randomUUID();
  const poNumber = await nextNumber();

  const paymentLegs: { amount: ReturnType<typeof D>; method: string; comment: string; suffix: string }[] = [];
  if (payAmount.gt(0)) {
    const cards = await loadPaymentCards();
    const card = cards.find((c) => c.id === parsed.data.cardId);
    const cardLabel = card ? card.bank : "Карта";
    if (cardPaid.gt(0)) {
      paymentLegs.push({
        amount: cardPaid,
        method: `card:${parsed.data.cardId}`,
        comment: `Оплата на карту: ${cardLabel}`,
        suffix: `${idempotencyKey}-card`,
      });
    }
    if (cashPaid.gt(0)) {
      paymentLegs.push({
        amount: cashPaid,
        method: "cash",
        comment:
          parsed.data.payMode === "partial"
            ? "Частичная оплата поставщику (нал)"
            : "Оплата поставщику (нал)",
        suffix: `${idempotencyKey}-cash`,
      });
    }
  }

  try {
    await prisma.$transaction(async (tx) => {
      await tx.supplierMaterial.upsert({
        where: {
          supplierId_materialId: { supplierId: supplier.id, materialId: material.id },
        },
        create: { supplierId: supplier.id, materialId: material.id },
        update: {},
      });

      const order = await tx.purchaseOrder.create({
        data: {
          number: poNumber,
          supplierId: supplier.id,
          status: "ORDERED",
          total: money(total),
          paidAmount: "0",
          comment: parsed.data.comment ?? "Приход на склад",
          createdById: session.user.id,
          confirmedById: session.user.id,
          confirmedAt: new Date(),
          items: {
            create: [
              {
                materialId: material.id,
                quantity: qty(parsed.data.quantity),
                unitPrice: qty(unitCost),
                amount: money(total),
              },
            ],
          },
        },
        include: { items: true },
      });

      const item = order.items[0]!;
      await receiveMaterial(
        {
          warehouseId: raw.id,
          materialId: material.id,
          quantity: qty(parsed.data.quantity),
          unitCost: qty(unitCost),
          userId: session.user.id,
          reason: "Приход от поставщика",
          relatedType: "purchase_order",
          relatedId: order.id,
          idempotencyKey: `${idempotencyKey}-recv`,
        },
        tx,
      );

      await tx.purchaseItem.update({
        where: { id: item.id },
        data: { receivedQty: qty(parsed.data.quantity) },
      });

      await tx.materialPriceHistory.updateMany({
        where: { materialId: material.id, validTo: null },
        data: { validTo: new Date() },
      });
      const packagePrice = unitCost.mul(material.packageWeight);
      await tx.materialPriceHistory.create({
        data: {
          materialId: material.id,
          packageWeight: material.packageWeight,
          packagePrice: money(packagePrice),
          unitPrice: qty(unitCost),
          createdById: session.user.id,
        },
      });
      await tx.material.update({
        where: { id: material.id },
        data: {
          packagePrice: money(packagePrice),
          lastPurchasePrice: qty(unitCost),
          averagePurchasePrice: qty(unitCost),
        },
      });

      await tx.purchaseOrder.update({
        where: { id: order.id },
        data: { status: "POSTED", receivedById: session.user.id, receivedAt: new Date() },
      });

      if (paymentLegs.length > 0) {
        for (const leg of paymentLegs) {
          await postPurchasePaymentInTx(tx, {
            orderId: order.id,
            orderNumber: order.number,
            amount: money(leg.amount),
            method: leg.method,
            userId: session.user.id,
            idempotencySuffix: leg.suffix,
            comment: leg.comment,
          });
        }
      }
    });
  } catch (error) {
    return { error: error instanceof Error ? error.message : "Не удалось оформить приход." };
  }

  await writeAudit({
    userId: session.user.id,
    action: "purchase.intake",
    entityType: "purchase_order",
    newValue: {
      materialId: material.id,
      supplierId: supplier.id,
      quantity: parsed.data.quantity,
      payMode: parsed.data.payMode,
    },
  });

  revalidatePath("/warehouse");
  revalidatePath("/materials");
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
  const unitPriceRaw = String(formData.get("unitPrice") ?? "").trim();
  if (!supplierId || !materialId) return { error: "Нужны поставщик и материал." };
  const material = await prisma.material.findUnique({ where: { id: materialId } });
  if (!material) return { error: "Материал не найден." };
  if (!quantity || D(quantity).lte(0)) return { error: "Количество должно быть больше 0." };

  let unitPrice = unitPriceRaw;
  if (!unitPrice || D(unitPrice).lte(0)) {
    const fallback = material.lastPurchasePrice ?? D(String(material.packagePrice)).div(material.packageWeight);
    unitPrice = qty(fallback);
  }
  if (!/^\d+(\.\d{1,6})?$/.test(unitPrice) || D(unitPrice).lte(0)) {
    return { error: "Укажите цену сырья за единицу." };
  }

  formData.set("comment", "Заявка по дефициту / минимуму");
  formData.set("unitPrice", unitPrice);
  void session;
  const result = await createPurchaseOrder(formData);
  if (result?.ok && result.id) {
    redirect(`/purchasing/${result.id}`);
  }
  return result;
}

/** Update line prices on a REQUEST purchase (e.g. after buying shortage). */
export async function updatePurchaseItemPrices(formData: FormData) {
  const session = await requirePermission("purchasing.manage");
  const id = String(formData.get("id") ?? "");
  const order = await prisma.purchaseOrder.findUnique({
    where: { id },
    include: { items: true },
  });
  if (!order) return { error: "Заявка не найдена." };
  if (order.status !== "REQUEST" && order.status !== "ORDERED") {
    return { error: "Цены можно менять до оприходования." };
  }

  const itemIds = formData.getAll("itemId").map(String);
  const unitPrices = formData.getAll("unitPrice").map(String);
  if (itemIds.length === 0) return { error: "Нет позиций." };

  let total = D(0);
  for (let i = 0; i < itemIds.length; i++) {
    const itemId = itemIds[i];
    const unitPrice = unitPrices[i] ?? "";
    if (!/^\d+(\.\d{1,6})?$/.test(unitPrice) || D(unitPrice).lt(0)) {
      return { error: "Проверьте цены." };
    }
    const item = order.items.find((row) => row.id === itemId);
    if (!item) return { error: "Позиция не найдена." };
    const amount = D(String(item.quantity)).mul(unitPrice);
    total = total.add(amount);
    await prisma.purchaseItem.update({
      where: { id: itemId },
      data: { unitPrice, amount: money(amount) },
    });
  }

  await prisma.purchaseOrder.update({
    where: { id },
    data: { total: money(total) },
  });
  await writeAudit({
    userId: session.user.id,
    action: "purchase.prices",
    entityType: "purchase_order",
    entityId: id,
    newValue: { total: money(total) },
  });
  revalidatePath("/purchasing");
  revalidatePath(`/purchasing/${id}`);
  return { ok: true };
}
