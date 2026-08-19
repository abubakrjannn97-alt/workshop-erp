"use server";

import { randomUUID } from "crypto";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { Prisma } from "@prisma/client";
import { prisma } from "@core/infrastructure/prisma";
import { requirePermission } from "@core/auth/authz";
import { writeAudit } from "@core/control/audit";
import { D, money, qty } from "@core/shared/decimal";
import { available, releaseMaterial, reserveMaterial } from "@core/inventory/stock";
import { postClientPayment } from "@core/finance/finance";
import {
  accrueSellerCommission,
  commissionPercentNow,
  reverseCommissionForPayment,
} from "@core/payroll/payroll";
import {
  discountLimitPercent,
  mergeMaterialNeeds,
  nextOrderNumber,
  ORDER_STATUS,
  paymentStatusOf,
  quoteProduct,
  STATUS_FLOW,
} from "@core/orders/orders";
import { issueOrderStockAndMarkIssued, completeIssuedOrder } from "@core/orders/issue-complete";
import { canSelfApprove, pendingFor, queueApproval } from "@core/control/control";
import { findFinishedGoodsWarehouse, findRawWarehouse } from "@/core/config/resolve-warehouse";
import { resolveProductionPaySchemeCode } from "@core/config/domain-config";

function moneyStr(value: string) {
  return z.string().regex(/^\d+(\.\d{1,4})?$/).safeParse(value).success;
}

function qtyStr(value: string) {
  return z.string().regex(/^\d+(\.\d{1,6})?$/).safeParse(value).success;
}

async function canSeeOrder(userId: string, roleCode: string, sellerId: string) {
  if (roleCode === "owner" || roleCode === "director" || roleCode === "accountant" || roleCode === "production_manager") {
    return true;
  }
  return sellerId === userId;
}

export async function createOrder(formData: FormData) {
  const session = await requirePermission("orders.create");
  const customerId = String(formData.get("customerId") ?? "");
  const productId = String(formData.get("productId") ?? "");
  const quantity = String(formData.get("quantity") ?? "");
  const unitPrice = String(formData.get("unitPrice") ?? "");
  const discountPercent = String(formData.get("discountPercent") ?? "0") || "0";
  const sellerId =
    session.user.roleCode === "sales_manager"
      ? session.user.id
      : String(formData.get("sellerId") ?? session.user.id);
  const paymentMethod = String(formData.get("paymentMethod") ?? "") || null;
  const dueAtRaw = String(formData.get("dueAt") ?? "");
  const leadId = String(formData.get("leadId") ?? "");

  if (!productId) return { error: "Выберите изделие." };
  if (!qtyStr(quantity)) return { error: "Некорректное количество." };
  if (!moneyStr(unitPrice)) return { error: "Некорректная цена." };
  if (!moneyStr(discountPercent)) return { error: "Некорректная скидка." };

  const product = await prisma.product.findUnique({ where: { id: productId } });
  if (!product || product.archivedAt) return { error: "Изделие не найдено." };
  if (D(unitPrice).lt(product.minPrice)) {
    return { error: `Цена ниже минимальной (${money(product.minPrice)}).` };
  }

  const discount = D(discountPercent);
  if (discount.lt(0) || discount.gt(100)) return { error: "Скидка 0–100%." };
  let requestedOverLimit: string | null = null;
  if (discount.gt(0)) {
    if (session.user.roleCode !== "owner" && !session.user.permissions.includes("orders.discount")) {
      return { error: "Нет права на скидку." };
    }
    const limit = await discountLimitPercent();
    if (discount.gt(limit) && !canSelfApprove(session.user.roleCode)) {
      requestedOverLimit = discountPercent;
    }
  }
  const appliedDiscount = requestedOverLimit ? D(0) : discount;

  let quote;
  try {
    quote = await quoteProduct(productId, quantity, unitPrice);
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Не удалось рассчитать заказ." };
  }

  const subtotal = D(quote.amount);
  const discountAmount = subtotal.mul(appliedDiscount).div(100);
  const total = subtotal.sub(discountAmount);
  const needs = mergeMaterialNeeds([quote]);

  let order;
  try {
  order = await prisma.$transaction(async (tx) => {
    let resolvedCustomerId = customerId;
    const lead = leadId ? await tx.lead.findUnique({ where: { id: leadId } }) : null;
    if (!resolvedCustomerId && lead) {
      const createdCustomer = await tx.customer.create({
        data: {
          name: lead.name,
          phone: lead.phone,
          managerId: lead.managerId ?? session.user.id,
        },
      });
      resolvedCustomerId = createdCustomer.id;
    }
    if (!resolvedCustomerId) throw new Error("Выберите клиента.");
    const status = await tx.orderStatus.findUniqueOrThrow({ where: { code: ORDER_STATUS.NEW } });
    const number = await nextOrderNumber(tx);
    const created = await tx.order.create({
      data: {
        number,
        customerId: resolvedCustomerId,
        sellerId,
        statusId: status.id,
        paymentStatus: "unpaid",
        paymentMethod,
        dueAt: dueAtRaw ? new Date(dueAtRaw) : null,
        discountPercent: money(appliedDiscount),
        discountAmount: money(discountAmount),
        subtotal: money(subtotal),
        total: money(total),
        paidAmount: "0",
        materialCost: quote.materialCost,
        outputQty: quote.outputQty,
        recipeSnapshot: {
          quotes: [quote],
        } as Prisma.InputJsonValue,
        createdById: session.user.id,
        items: {
          create: {
            productId,
            quantity: quote.quantity,
            unitPrice: quote.unitPrice,
            amount: quote.amount,
            outputQty: quote.outputQty,
            recipeVersionId: quote.recipeVersionId,
          },
        },
        materials: {
          create: needs.map((line) => ({
            materialId: line.materialId,
            plannedQty: line.plannedQty,
            unitCost: line.unitCost,
            lineCost: line.lineCost,
          })),
        },
      },
    });
    if (lead && !lead.convertedOrderId) {
      const won = await tx.leadStage.findUnique({ where: { code: "WON" } });
      await tx.lead.update({
        where: { id: leadId },
        data: {
          convertedOrderId: created.id,
          customerId: resolvedCustomerId,
          ...(won ? { stageId: won.id } : {}),
        },
      });
    }
    return created;
  });
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Не удалось создать заказ." };
  }

  await writeAudit({
    userId: session.user.id,
    action: "order.create",
    entityType: "order",
    entityId: order.id,
    newValue: { number: order.number, total: money(total) },
  });
  if (requestedOverLimit) {
    await queueApproval({
      type: "DISCOUNT",
      title: `Скидка ${requestedOverLimit}% по заказу #${order.number}`,
      entityType: "order",
      entityId: order.id,
      payload: { orderId: order.id, discountPercent: requestedOverLimit },
      requestedById: session.user.id,
    });
  }
  revalidatePath("/orders");
  revalidatePath("/sales");
  revalidatePath("/crm");
  return { ok: true, id: order.id };
}

export async function confirmOrder(formData: FormData) {
  const session = await requirePermission("orders.create");
  const id = String(formData.get("id") ?? "");
  const order = await prisma.order.findUnique({
    where: { id },
    include: { status: true, materials: true, seller: true, items: true, production: true },
  });
  if (!order) return { error: "Заказ не найден." };
  if (!(await canSeeOrder(session.user.id, session.user.roleCode, order.sellerId))) {
    return { error: "Нет доступа." };
  }
  if (order.status.code !== ORDER_STATUS.NEW && order.status.code !== ORDER_STATUS.AWAITING_PAYMENT) {
    return { error: "Заказ уже подтверждён или закрыт." };
  }
  if (await pendingFor("order", id, "DISCOUNT")) {
    return { error: "Скидка на согласовании у руководителя." };
  }

  const raw = await findRawWarehouse();
  if (!raw) return { error: "Склад сырья не найден." };
  const confirmed = await prisma.orderStatus.findUniqueOrThrow({ where: { code: ORDER_STATUS.CONFIRMED } });

  try {
    await prisma.$transaction(async (tx) => {
      let canProduceFully = true;
      for (const need of order.materials) {
        const result = await reserveMaterial(
          {
            warehouseId: raw.id,
            materialId: need.materialId,
            quantity: qty(need.plannedQty),
            userId: session.user.id,
            relatedType: "order",
            relatedId: order.id,
            idempotencyKey: `order-reserve-${order.id}-${need.materialId}`,
            partial: true,
          },
          tx,
        );
        if (D(result.shortage).gt(0)) canProduceFully = false;
        await tx.orderMaterialNeed.update({
          where: { id: need.id },
          data: { reservedQty: result.reserved },
        });
      }
      await tx.order.update({
        where: { id },
        data: {
          statusId: confirmed.id,
          confirmedAt: new Date(),
          canProduceFully,
        },
      });
      if (!order.production) {
        const plannedQty = order.items.reduce((s, item) => s.add(String(item.quantity)), D(0));
        await tx.productionOrder.create({
          data: {
            orderId: order.id,
            status: "OPEN",
            plannedQty: qty(plannedQty),
            dueAt: order.dueAt,
          },
        });
      }
    });
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Не удалось подтвердить." };
  }

  await writeAudit({
    userId: session.user.id,
    action: "order.confirm",
    entityType: "order",
    entityId: id,
  });
  revalidatePath("/orders");
  revalidatePath(`/orders/${id}`);
  revalidatePath("/warehouse");
  revalidatePath("/production");
  return { ok: true };
}

export async function cancelOrder(formData: FormData) {
  const session = await requirePermission("orders.cancel");
  const id = String(formData.get("id") ?? "");
  const order = await prisma.order.findUnique({
    where: { id },
    include: { status: true, materials: true },
  });
  if (!order) return { error: "Заказ не найден." };
  if (order.status.code === ORDER_STATUS.CANCELLED) return { error: "Заказ уже отменён." };
  if (
    D(String(order.paidAmount)).gt(0) &&
    !canSelfApprove(session.user.roleCode) &&
    String(formData.get("_approved") ?? "") !== "1"
  ) {
    await queueApproval({
      type: "CANCEL_PAID",
      title: `Отмена оплаченного заказа #${order.number}`,
      entityType: "order",
      entityId: id,
      payload: { id },
      requestedById: session.user.id,
    });
    return { ok: true, pending: true };
  }

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
              userId: session.user.id,
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

  await writeAudit({
    userId: session.user.id,
    action: "order.cancel",
    entityType: "order",
    entityId: id,
  });
  revalidatePath("/orders");
  revalidatePath(`/orders/${id}`);
  revalidatePath("/warehouse");
  return { ok: true };
}

export async function updateOrderStatus(formData: FormData) {
  const session = await requirePermission("orders.create");
  const id = String(formData.get("id") ?? "");
  const code = String(formData.get("statusCode") ?? "");
  const order = await prisma.order.findUnique({ where: { id }, include: { status: true } });
  if (!order) return { error: "Заказ не найден." };
  if (code === ORDER_STATUS.CONFIRMED) return { error: "Подтверждение — отдельным действием (резерв сырья)." };
  if (code === ORDER_STATUS.CANCELLED) return { error: "Отмена — отдельным действием." };
  const allowed = STATUS_FLOW[order.status.code] ?? [];
  if (!allowed.includes(code)) return { error: "Недопустимый переход статуса." };
  const next = await prisma.orderStatus.findUnique({ where: { code } });
  if (!next) return { error: "Статус не найден." };
  await prisma.order.update({ where: { id }, data: { statusId: next.id } });
  await writeAudit({
    userId: session.user.id,
    action: "order.status",
    entityType: "order",
    entityId: id,
    newValue: { from: order.status.code, to: code },
  });
  revalidatePath("/orders");
  revalidatePath(`/orders/${id}`);
  return { ok: true };
}

export async function addPayment(formData: FormData) {
  const session = await requirePermission("payments.create");
  const orderId = String(formData.get("orderId") ?? "");
  const amount = String(formData.get("amount") ?? "");
  const method = String(formData.get("method") ?? "") || null;
  const comment = String(formData.get("comment") ?? "").trim();
  const key = String(formData.get("idempotencyKey") ?? randomUUID());
  if (!moneyStr(amount) || D(amount).lte(0)) return { error: "Сумма оплаты должна быть больше нуля." };

  const existing = await prisma.payment.findUnique({ where: { idempotencyKey: key } });
  if (existing) return { ok: true, id: existing.id };

  const order = await prisma.order.findUnique({
    where: { id: orderId },
    include: {
      items: true,
      payments: true,
      seller: { include: { payScheme: { include: { tiers: true } } } },
    },
  });
  if (!order) return { error: "Заказ не найден." };
  if (!(await canSeeOrder(session.user.id, session.user.roleCode, order.sellerId))) {
    return { error: "Нет доступа." };
  }

  const productionSchemeCode = await resolveProductionPaySchemeCode();
  let paymentId: string | null = null;
  let created = false;
  await prisma.$transaction(async (tx) => {
    const dup = await tx.payment.findUnique({ where: { idempotencyKey: key } });
    if (dup) {
      paymentId = dup.id;
      return;
    }

    let payment;
    try {
      payment = await tx.payment.create({
        data: {
          orderId,
          amount: money(amount),
          method,
          comment: comment || null,
          idempotencyKey: key,
          createdById: session.user.id,
        },
      });
    } catch (e) {
      if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") {
        const raced = await tx.payment.findUnique({ where: { idempotencyKey: key } });
        if (raced) {
          paymentId = raced.id;
          return;
        }
      }
      throw e;
    }
    paymentId = payment.id;
    created = true;
    const payments = await tx.payment.findMany({ where: { orderId } });
    const paid = payments.reduce((s, p) => s.add(String(p.amount)), D(0));
    const hadRefund = payments.some((p) => p.reversesId);
    await tx.order.update({
      where: { id: orderId },
      data: { paidAmount: money(paid), paymentStatus: paymentStatusOf(order.total, paid, hadRefund) },
    });
    // productionRate applies to the sale-unit quantity, not finished-goods outputQty.
    const saleQty = order.items.reduce((s, item) => s.add(String(item.quantity)), D(0));
    const scheme = order.seller.payScheme;
    const laborAmount = scheme?.productionRate
      ? money(saleQty.mul(scheme.productionRate))
      : "0";
    let commissionAmount = "0";
    if (scheme && (scheme.kind === "SALES_COMMISSION" || scheme.kind === "MIXED") && scheme.tiers.length) {
      const pct = await commissionPercentNow(tx, order.sellerId, orderId, scheme);
      commissionAmount = money(D(amount).mul(pct).div(100));
      await accrueSellerCommission(tx, {
        sellerId: order.sellerId,
        orderId,
        paymentId: payment.id,
        paidAmount: money(amount),
        scheme,
      });
    }
    const prodScheme = await tx.payScheme.findUnique({ where: { code: productionSchemeCode } });
    const laborFromProd = prodScheme?.productionRate
      ? money(saleQty.mul(prodScheme.productionRate))
      : laborAmount;
    await postClientPayment(tx, {
      orderId,
      paymentId: payment.id,
      amount: money(amount),
      method,
      orderTotal: String(order.total),
      materialCost: order.materialCost ? String(order.materialCost) : null,
      laborAmount: laborFromProd,
      commissionAmount,
      userId: session.user.id,
    });
  });

  if (!created) {
    return { ok: true, id: paymentId ?? undefined };
  }

  await writeAudit({
    userId: session.user.id,
    action: "payment.create",
    entityType: "order",
    entityId: orderId,
    newValue: { amount: money(amount) },
  });
  revalidatePath("/orders");
  revalidatePath(`/orders/${orderId}`);
  revalidatePath("/sales");
  revalidatePath("/finance");
  return { ok: true, id: paymentId ?? undefined };
}

export async function reversePayment(formData: FormData) {
  const session = await requirePermission("payments.create");
  const paymentId = String(formData.get("paymentId") ?? "");
  const payment = await prisma.payment.findUnique({
    where: { id: paymentId },
    include: { reversedBy: true, order: { include: { items: true } } },
  });
  if (!payment) return { error: "Оплата не найдена." };
  if (payment.reversedBy) return { error: "Оплата уже сторнирована." };
  if (payment.reversesId) return { error: "Нельзя сторнировать сторно." };

  if (!canSelfApprove(session.user.roleCode) && String(formData.get("_approved") ?? "") !== "1") {
    await queueApproval({
      type: "REFUND",
      title: `Возврат оплаты по заказу #${payment.order.number}`,
      entityType: "payment",
      entityId: paymentId,
      payload: { paymentId },
      requestedById: session.user.id,
    });
    return { ok: true, pending: true };
  }

  const productionSchemeCode = await resolveProductionPaySchemeCode();
  await prisma.$transaction(async (tx) => {
    const reversal = await tx.payment.create({
      data: {
        orderId: payment.orderId,
        amount: money(D(String(payment.amount)).neg()),
        method: payment.method,
        comment: "Сторно оплаты",
        reversesId: payment.id,
        createdById: session.user.id,
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
    const prodScheme = await tx.payScheme.findUnique({ where: { code: productionSchemeCode } });
    const saleQty = payment.order.items.reduce((s, item) => s.add(String(item.quantity)), D(0));
    await postClientPayment(tx, {
      orderId: payment.orderId,
      paymentId: reversal.id,
      amount: money(D(String(payment.amount)).neg()),
      method: payment.method,
      orderTotal: String(payment.order.total),
      materialCost: payment.order.materialCost ? String(payment.order.materialCost) : null,
      laborAmount: prodScheme?.productionRate
        ? money(saleQty.mul(prodScheme.productionRate))
        : "0",
      commissionAmount: commSum._sum.amount ? money(commSum._sum.amount) : "0",
      userId: session.user.id,
      reverseOf: payment.id,
    });
  });

  await writeAudit({
    userId: session.user.id,
    action: "payment.reverse",
    entityType: "payment",
    entityId: paymentId,
  });
  revalidatePath(`/orders/${payment.orderId}`);
  revalidatePath("/finance");
  return { ok: true };
}

export async function createPurchaseFromDeficit(formData: FormData) {
  const session = await requirePermission("purchasing.manage");
  const orderId = String(formData.get("orderId") ?? "");
  const order = await prisma.order.findUnique({
    where: { id: orderId },
    include: { materials: { include: { material: { include: { supplierLinks: true, storageUnit: true } } } } },
  });
  if (!order) return { error: "Заказ не найден." };

  const raw = await findRawWarehouse();
  if (!raw) return { error: "Склад сырья не найден." };

  const shortages: { materialId: string; quantity: string; unitPrice: string }[] = [];
  for (const need of order.materials) {
    const item = await prisma.stockItem.findUnique({
      where: { warehouseId_materialId: { warehouseId: raw.id, materialId: need.materialId } },
    });
    const avail = item ? available(item.qtyOnHand, item.qtyReserved) : D(0);
    const short = D(String(need.plannedQty)).sub(D(String(need.reservedQty)));
    if (short.lte(0) && avail.gte(need.plannedQty)) continue;
    const qtyNeed = short.gt(0) ? short : D(String(need.plannedQty)).sub(avail);
    if (qtyNeed.lte(0)) continue;
    const pack = D(String(need.material.packageWeight));
    const unitPrice = money(
      need.unitCost ?? (pack.gt(0) ? D(String(need.material.packagePrice)).div(pack) : 0),
    );
    shortages.push({ materialId: need.materialId, quantity: qty(qtyNeed), unitPrice });
  }
  if (shortages.length === 0) return { error: "Дефицита нет." };

  const supplier =
    (await prisma.supplier.findFirst({
      where: { archivedAt: null, materials: { some: { materialId: { in: shortages.map((s) => s.materialId) } } } },
    })) ?? (await prisma.supplier.findFirst({ where: { archivedAt: null } }));
  if (!supplier) return { error: "Сначала добавьте поставщика." };

  const last = await prisma.purchaseOrder.findFirst({ orderBy: { createdAt: "desc" } });
  const n = last ? Number(last.number.replace(/\D/g, "")) + 1 : 1;
  const number = `PO-${String(Number.isFinite(n) ? n : 1).padStart(4, "0")}`;
  const total = shortages.reduce((s, i) => s.add(D(i.quantity).mul(i.unitPrice)), D(0));

  const po = await prisma.purchaseOrder.create({
    data: {
      number,
      supplierId: supplier.id,
      status: "REQUEST",
      total: money(total),
      comment: `Дефицит заказа #${order.number}`,
      createdById: session.user.id,
      items: {
        create: shortages.map((item) => ({
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
    action: "purchase.from_deficit",
    entityType: "purchase_order",
    entityId: po.id,
    newValue: { orderNumber: order.number, number: po.number },
  });
  revalidatePath("/purchasing");
  revalidatePath(`/orders/${orderId}`);
  return { ok: true, id: po.id };
}

export async function issueOrderToCustomer(formData: FormData) {
  const session = await requirePermission("inventory.receive");
  const id = String(formData.get("id") ?? "");
  const order = await prisma.order.findUnique({
    where: { id },
    include: { status: true, items: true },
  });
  if (!order) return { error: "Заказ не найден." };
  if (order.status.code !== ORDER_STATUS.IN_FG && order.status.code !== ORDER_STATUS.READY) {
    return { error: "Выдавать можно с склада готовой продукции." };
  }
  const fg = await findFinishedGoodsWarehouse();
  if (!fg) return { error: "Склад ГП не найден." };

  try {
    await prisma.$transaction(async (tx) => {
      await issueOrderStockAndMarkIssued(tx, {
        orderId: order.id,
        orderNumber: order.number,
        items: order.items,
        warehouseId: fg.id,
        userId: session.user.id,
      });
    });
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Не удалось выдать заказ." };
  }

  await writeAudit({
    userId: session.user.id,
    action: "order.issue",
    entityType: "order",
    entityId: id,
  });
  revalidatePath(`/orders/${id}`);
  revalidatePath("/warehouse/finished");
  return { ok: true };
}

export async function completeOrder(formData: FormData) {
  const session = await requirePermission("orders.create");
  const id = String(formData.get("id") ?? "");
  try {
    await prisma.$transaction(async (tx) => {
      await completeIssuedOrder(tx, id);
    });
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Не удалось завершить заказ." };
  }
  await writeAudit({
    userId: session.user.id,
    action: "order.complete",
    entityType: "order",
    entityId: id,
  });
  revalidatePath(`/orders/${id}`);
  revalidatePath("/orders");
  return { ok: true };
}

export async function createMultiItemOrder(formData: FormData) {
  const session = await requirePermission("orders.create");
  const customerId = String(formData.get("customerId") ?? "");
  const discountPercent = String(formData.get("discountPercent") ?? "0") || "0";
  const sellerId =
    session.user.roleCode === "sales_manager"
      ? session.user.id
      : String(formData.get("sellerId") ?? session.user.id);
  const paymentMethod = String(formData.get("paymentMethod") ?? "") || null;
  const dueAtRaw = String(formData.get("dueAt") ?? "");
  const leadId = String(formData.get("leadId") ?? "");

  const productIds = formData.getAll("productId[]").map(String);
  const quantities = formData.getAll("quantity[]").map(String);
  const unitPrices = formData.getAll("unitPrice[]").map(String);

  if (productIds.length === 0) return { error: "Добавьте хотя бы одно изделие." };

  const items = productIds
    .map((pid, i) => ({ productId: pid, quantity: quantities[i] ?? "", unitPrice: unitPrices[i] ?? "" }))
    .filter((item) => item.productId && item.quantity && item.unitPrice);

  if (items.length === 0) return { error: "Добавьте хотя бы одно изделие." };

  for (const item of items) {
    if (!qtyStr(item.quantity)) return { error: "Некорректное количество." };
    if (!moneyStr(item.unitPrice)) return { error: "Некорректная цена." };
  }

  const discount = D(discountPercent);
  if (discount.lt(0) || discount.gt(100)) return { error: "Скидка 0–100%." };
  let requestedOverLimit: string | null = null;
  if (discount.gt(0)) {
    if (session.user.roleCode !== "owner" && !session.user.permissions.includes("orders.discount")) {
      return { error: "Нет права на скидку." };
    }
    const limit = await discountLimitPercent();
    if (discount.gt(limit) && !canSelfApprove(session.user.roleCode)) {
      requestedOverLimit = discountPercent;
    }
  }
  const appliedDiscount = requestedOverLimit ? D(0) : discount;

  const quotes = [];
  for (const item of items) {
    const product = await prisma.product.findUnique({ where: { id: item.productId } });
    if (!product || product.archivedAt) return { error: "Изделие не найдено." };
    if (D(item.unitPrice).lt(product.minPrice)) {
      return { error: `Цена ниже минимальной для ${product.name} (${money(product.minPrice)}).` };
    }
    try {
      quotes.push(await quoteProduct(item.productId, item.quantity, item.unitPrice));
    } catch (e) {
      return { error: e instanceof Error ? e.message : "Не удалось рассчитать заказ." };
    }
  }

  const subtotal = quotes.reduce((s, q) => s.add(q.amount), D(0));
  const discountAmount = subtotal.mul(appliedDiscount).div(100);
  const total = subtotal.sub(discountAmount);
  const needs = mergeMaterialNeeds(quotes);
  const materialCost = quotes.reduce((s, q) => (q.materialCost ? s.add(q.materialCost) : s), D(0));
  const outputQty = quotes.reduce((s, q) => s.add(q.outputQty), D(0));

  let order;
  try {
    order = await prisma.$transaction(async (tx) => {
      let resolvedCustomerId = customerId;
      const lead = leadId ? await tx.lead.findUnique({ where: { id: leadId } }) : null;
      if (!resolvedCustomerId && lead) {
        const createdCustomer = await tx.customer.create({
          data: { name: lead.name, phone: lead.phone, managerId: lead.managerId ?? session.user.id },
        });
        resolvedCustomerId = createdCustomer.id;
      }
      if (!resolvedCustomerId) throw new Error("Выберите клиента.");
      const status = await tx.orderStatus.findUniqueOrThrow({ where: { code: ORDER_STATUS.NEW } });
      const number = await nextOrderNumber(tx);
      const created = await tx.order.create({
        data: {
          number,
          customerId: resolvedCustomerId,
          sellerId,
          statusId: status.id,
          paymentStatus: "unpaid",
          paymentMethod,
          dueAt: dueAtRaw ? new Date(dueAtRaw) : null,
          discountPercent: money(appliedDiscount),
          discountAmount: money(discountAmount),
          subtotal: money(subtotal),
          total: money(total),
          paidAmount: "0",
          materialCost: money(materialCost),
          outputQty: qty(outputQty),
          recipeSnapshot: { quotes } as Prisma.InputJsonValue,
          createdById: session.user.id,
          items: {
            create: quotes.map((q) => ({
              productId: q.productId,
              quantity: q.quantity,
              unitPrice: q.unitPrice,
              amount: q.amount,
              outputQty: q.outputQty,
              recipeVersionId: q.recipeVersionId,
            })),
          },
          materials: {
            create: needs.map((line) => ({
              materialId: line.materialId,
              plannedQty: line.plannedQty,
              unitCost: line.unitCost,
              lineCost: line.lineCost,
            })),
          },
        },
      });
      if (lead && !lead.convertedOrderId) {
        const won = await tx.leadStage.findUnique({ where: { code: "WON" } });
        await tx.lead.update({
          where: { id: leadId },
          data: { convertedOrderId: created.id, customerId: resolvedCustomerId, ...(won ? { stageId: won.id } : {}) },
        });
      }
      return created;
    });
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Не удалось создать заказ." };
  }

  await writeAudit({
    userId: session.user.id,
    action: "order.create",
    entityType: "order",
    entityId: order.id,
    newValue: { number: order.number, total: money(total), items: items.length },
  });
  if (requestedOverLimit) {
    await queueApproval({
      type: "DISCOUNT",
      title: `Скидка ${requestedOverLimit}% по заказу #${order.number}`,
      entityType: "order",
      entityId: order.id,
      payload: { orderId: order.id, discountPercent: requestedOverLimit },
      requestedById: session.user.id,
    });
  }
  revalidatePath("/orders");
  revalidatePath("/sales");
  revalidatePath("/crm");
  return { ok: true, id: order.id };
}
