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

const NEW_CUSTOMER = "__new__";

/** One-tap sale from FG stock: create/find customer + order + write off FG immediately. */
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
      customerName: z.string().trim().min(1).max(200),
      phone: z.string().trim().min(1).max(40),
      productId: z.string().min(1),
      quantity: z.string().regex(/^\d+(\.\d{1,6})?$/),
      unitPrice: z.string().regex(/^\d+(\.\d{1,4})?$/),
      payMode: z.enum(["paid", "later", "partial"]).default("paid"),
      paidAmount: z.string().optional().or(z.literal("")),
      dueAt: z.string().optional().or(z.literal("")),
      comment: z.string().optional(),
    })
    .safeParse({
      customerId: formData.get("customerId") || NEW_CUSTOMER,
      customerName: formData.get("customerName") ?? "",
      phone: formData.get("phone") ?? "",
      productId: formData.get("productId"),
      quantity: formData.get("quantity"),
      unitPrice: formData.get("unitPrice"),
      payMode: formData.get("payMode") || "paid",
      paidAmount: formData.get("paidAmount") ?? "",
      dueAt: formData.get("dueAt") ?? "",
      comment: formData.get("comment") || undefined,
    });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Проверьте поля." };

  const qtyVal = D(parsed.data.quantity);
  const price = D(parsed.data.unitPrice);
  if (!qtyVal.gt(0)) return { error: "Укажите количество." };
  if (price.lt(0)) return { error: "Цена некорректна." };

  const [product, fg] = await Promise.all([
    prisma.product.findFirst({
      where: { id: parsed.data.productId, archivedAt: null, isActive: true },
      include: { saleUnit: true },
    }),
    findFinishedGoodsWarehouse(),
  ]);
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
  const payMode = parsed.data.payMode;
  let paidRaw = D(0);
  let dueAt: Date | null = null;

  if (payMode === "paid") {
    paidRaw = lineTotal;
  } else if (payMode === "later") {
    if (!parsed.data.dueAt) return { error: "Укажите дату оплаты." };
    dueAt = new Date(`${parsed.data.dueAt}T12:00:00`);
    if (Number.isNaN(dueAt.getTime())) return { error: "Некорректная дата оплаты." };
  } else {
    if (!parsed.data.paidAmount?.trim()) return { error: "Укажите сумму частичной оплаты." };
    paidRaw = D(parsed.data.paidAmount);
    if (!paidRaw.gt(0)) return { error: "Частичная оплата должна быть больше 0." };
    if (paidRaw.gte(lineTotal)) {
      return { error: "Частичная оплата должна быть меньше полной суммы." };
    }
  }

  let customerId = parsed.data.customerId;
  const phone = parsed.data.phone.trim();
  const isNewCustomer = customerId === NEW_CUSTOMER || !customerId;

  if (isNewCustomer) {
    const created = await prisma.customer.create({
      data: {
        name: parsed.data.customerName.trim(),
        phone,
        whatsapp: phone,
        managerId: session.user.roleCode === "sales_manager" ? session.user.id : null,
      },
    });
    customerId = created.id;
    await writeAudit({
      userId: session.user.id,
      action: "customer.create",
      entityType: "customer",
      entityId: created.id,
      newValue: { name: created.name, from: "quick_sale" },
    });
  } else {
    const existing = await prisma.customer.findFirst({
      where: { id: customerId, archivedAt: null },
    });
    if (!existing) return { error: "Клиент не найден." };
    await prisma.customer.update({
      where: { id: existing.id },
      data: {
        name: parsed.data.customerName.trim() || existing.name,
        phone: phone || existing.phone,
        whatsapp: existing.whatsapp || phone,
      },
    });
  }

  const inFgStatus = await prisma.orderStatus.findUniqueOrThrow({ where: { code: ORDER_STATUS.IN_FG } });
  const number = await nextOrderNumber();
  const idempotencyKey = String(formData.get("idempotencyKey") ?? randomUUID());

  let orderId = "";
  try {
    await prisma.$transaction(async (tx) => {
      const order = await tx.order.create({
        data: {
          number,
          customerId,
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
          dueAt,
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
            comment:
              parsed.data.comment?.trim() ||
              (payMode === "partial" ? "Частичная оплата" : "Быстрая продажа"),
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
      customerId,
      payMode,
    },
  });

  revalidatePath("/orders");
  revalidatePath("/orders/quick");
  revalidatePath("/warehouse");
  revalidatePath("/warehouse/finished");
  revalidatePath("/crm");
  revalidatePath("/");
  return { ok: true, id: orderId };
}
