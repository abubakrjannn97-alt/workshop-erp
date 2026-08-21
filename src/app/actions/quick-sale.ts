"use server";

import { randomUUID } from "crypto";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@core/infrastructure/prisma";
import { requirePermission } from "@core/auth/authz";
import { writeAudit } from "@core/control/audit";
import { D, money, qtyDisplay } from "@core/shared/decimal";
import { available } from "@core/inventory/stock";
import { findFinishedGoodsWarehouse } from "@core/config/resolve-warehouse";
import { nextOrderNumber, ORDER_STATUS, paymentStatusOf } from "@core/orders/orders";
import { issueOrderStockAndMarkIssued } from "@core/orders/issue-complete";
import { postClientPayment } from "@core/finance/finance";

/** One-tap sale from FG stock: create order + write off FG immediately. */
export async function quickSaleFromFg(formData: FormData) {
  const session = await requirePermission("orders.create");
  const canIssue =
    session.user.roleCode === "owner" ||
    session.user.roleCode === "director" ||
    session.user.permissions.includes("inventory.receive");
  if (!canIssue) return { error: "Нет права списывать со склада ГП." };

  const parsed = z
    .object({
      customerId: z.string().min(1),
      productId: z.string().min(1),
      quantity: z.string().regex(/^\d+(\.\d{1,6})?$/),
      unitPrice: z.string().regex(/^\d+(\.\d{1,4})?$/),
      paidNow: z.enum(["0", "1"]).default("1"),
      comment: z.string().optional(),
    })
    .safeParse({
      customerId: formData.get("customerId"),
      productId: formData.get("productId"),
      quantity: formData.get("quantity"),
      unitPrice: formData.get("unitPrice"),
      paidNow: formData.get("paidNow") === "0" ? "0" : "1",
      comment: formData.get("comment") || undefined,
    });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Проверьте поля." };

  const qtyVal = D(parsed.data.quantity);
  const price = D(parsed.data.unitPrice);
  if (!qtyVal.gt(0)) return { error: "Укажите количество." };
  if (price.lt(0)) return { error: "Цена некорректна." };

  const [customer, product, fg] = await Promise.all([
    prisma.customer.findFirst({ where: { id: parsed.data.customerId, archivedAt: null } }),
    prisma.product.findFirst({
      where: { id: parsed.data.productId, archivedAt: null, isActive: true },
      include: { saleUnit: true },
    }),
    findFinishedGoodsWarehouse(),
  ]);
  if (!customer) return { error: "Клиент не найден." };
  if (!product) return { error: "Изделие не найдено." };
  if (!fg) return { error: "Склад ГП не найден." };
  if (price.lt(product.minPrice)) {
    return { error: `Цена ниже минимальной (${money(product.minPrice)}).` };
  }

  const stock = await prisma.stockItem.findFirst({
    where: { warehouseId: fg.id, productId: product.id },
  });
  const avail = stock ? available(stock.qtyOnHand, stock.qtyReserved) : D(0);
  if (avail.lt(qtyVal)) {
    return {
      error: `На складе ГП не хватает «${product.name}»: нужно ${qtyDisplay(qtyVal)} ${product.saleUnit.symbol}, есть ${qtyDisplay(avail)}.`,
    };
  }

  const lineTotal = qtyVal.mul(price);
  const paidRaw = parsed.data.paidNow === "1" ? lineTotal : D(0);
  const inFgStatus = await prisma.orderStatus.findUniqueOrThrow({ where: { code: ORDER_STATUS.IN_FG } });
  const number = await nextOrderNumber();
  const idempotencyKey = String(formData.get("idempotencyKey") ?? randomUUID());

  let orderId = "";
  try {
    await prisma.$transaction(async (tx) => {
      const order = await tx.order.create({
        data: {
          number,
          customerId: customer.id,
          sellerId: session.user.id,
          statusId: inFgStatus.id,
          paymentStatus: paymentStatusOf(lineTotal, paidRaw, false),
          paymentMethod: paidRaw.gt(0) ? "cash" : null,
          discountPercent: 0,
          discountAmount: 0,
          subtotal: lineTotal.toFixed(4),
          total: lineTotal.toFixed(4),
          paidAmount: paidRaw.toFixed(4),
          outputQty: qtyVal.toFixed(6),
          canProduceFully: true,
          confirmedAt: new Date(),
          createdById: session.user.id,
          items: {
            create: {
              productId: product.id,
              quantity: qtyVal.toFixed(6),
              unitPrice: price.toFixed(4),
              amount: lineTotal.toFixed(4),
              outputQty: qtyVal.toFixed(6),
            },
          },
        },
        include: { items: true },
      });
      orderId = order.id;

      await issueOrderStockAndMarkIssued(tx, {
        orderId: order.id,
        orderNumber: order.number,
        items: order.items,
        warehouseId: fg.id,
        userId: session.user.id,
      });

      if (paidRaw.gt(0)) {
        const payment = await tx.payment.create({
          data: {
            orderId: order.id,
            amount: paidRaw.toFixed(4),
            method: "cash",
            comment: parsed.data.comment?.trim() || "Быстрая продажа",
            idempotencyKey: `${idempotencyKey}-pay`,
            createdById: session.user.id,
          },
        });
        await postClientPayment(tx, {
          orderId: order.id,
          paymentId: payment.id,
          amount: money(paidRaw),
          method: "cash",
          orderTotal: money(lineTotal),
          materialCost: "0",
          laborAmount: "0",
          commissionAmount: "0",
          userId: session.user.id,
        });
      }
    });
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Не удалось оформить продажу." };
  }

  await writeAudit({
    userId: session.user.id,
    action: "order.quick_sale",
    entityType: "order",
    entityId: orderId,
    newValue: {
      productId: product.id,
      quantity: parsed.data.quantity,
      total: lineTotal.toFixed(4),
    },
  });

  revalidatePath("/orders");
  revalidatePath("/warehouse");
  revalidatePath("/warehouse/finished");
  revalidatePath("/");
  return { ok: true, id: orderId };
}
