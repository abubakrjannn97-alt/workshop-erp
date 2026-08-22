"use server";

import { randomUUID } from "crypto";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { Prisma } from "@prisma/client";
import { prisma } from "@core/infrastructure/prisma";
import { requirePermission } from "@core/auth/authz";
import { writeAudit } from "@core/control/audit";
import { D, money, qtyDisplay } from "@core/shared/decimal";
import { available } from "@core/inventory/stock";
import { findFinishedGoodsWarehouse } from "@core/config/resolve-warehouse";
import { loadPaymentCards } from "@core/config/payment-cards";
import { materialCostForRecipe, scaleNeed } from "@core/costing/costing";
import { nextOrderNumber, ORDER_STATUS, paymentStatusOf } from "@core/orders/orders";
import { issueOrderStockAndMarkIssued } from "@core/orders/issue-complete";
import { postClientPayment } from "@core/finance/finance";
import { laborAmountForLines } from "@core/payroll/product-labor";

const NEW_CUSTOMER = "__new__";

const lineSchema = z.object({
  productId: z.string().min(1),
  quantity: z.string().regex(/^\d+(\.\d{1,6})?$/),
  unitPrice: z.string().regex(/^\d+(\.\d{1,4})?$/),
});

/** One-tap sale from FG stock: create/find customer + multi-line order + write off FG. */
export async function quickSaleFromFg(formData: FormData) {
  const session = await requirePermission("orders.create");
  const canIssue =
    session.user.roleCode === "owner" ||
    session.user.roleCode === "director" ||
    session.user.permissions.includes("inventory.receive");
  if (!canIssue) return { error: "Нет права списывать со склада ГП." };

  let itemsRaw: unknown = [];
  try {
    itemsRaw = JSON.parse(String(formData.get("items") ?? "[]"));
  } catch {
    return { error: "Некорректный список изделий." };
  }

  const parsed = z
    .object({
      customerId: z.string().min(1),
      customerName: z.string().trim().min(1).max(200),
      phone: z.string().trim().min(1).max(40),
      items: z.array(lineSchema).min(1),
      payMode: z.enum(["paid", "partial", "debt"]).default("paid"),
      payChannel: z.enum(["card", "cash", "split"]).default("cash"),
      cardId: z.string().optional(),
      cardAmount: z.string().optional(),
      cashAmount: z.string().optional(),
      paidAmount: z.string().optional().or(z.literal("")),
      comment: z.string().optional(),
    })
    .safeParse({
      customerId: formData.get("customerId") || NEW_CUSTOMER,
      customerName: formData.get("customerName") ?? "",
      phone: formData.get("phone") ?? "",
      items: itemsRaw,
      payMode: formData.get("payMode") || "paid",
      payChannel: formData.get("payChannel") || "cash",
      cardId: String(formData.get("cardId") ?? ""),
      cardAmount: String(formData.get("cardAmount") ?? ""),
      cashAmount: String(formData.get("cashAmount") ?? ""),
      paidAmount: formData.get("paidAmount") ?? "",
      comment: formData.get("comment") || undefined,
    });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Проверьте поля." };

  const fg = await findFinishedGoodsWarehouse();
  if (!fg) return { error: "Склад ГП не найден." };

  const productIds = [...new Set(parsed.data.items.map((i) => i.productId))];
  const products = await prisma.product.findMany({
    where: { id: { in: productIds }, archivedAt: null, isActive: true },
    include: {
      saleUnit: true,
      recipe: {
        include: {
          versions: {
            where: { validTo: null },
            include: {
              items: { include: { material: { include: { storageUnit: true } }, unit: true } },
            },
            take: 1,
          },
        },
      },
    },
  });
  if (products.length !== productIds.length) return { error: "Изделие не найдено." };
  const byId = new Map(products.map((p) => [p.id, p]));

  const stocks = await prisma.stockItem.findMany({
    where: { warehouseId: fg.id, productId: { in: productIds } },
  });
  const stockByProduct = new Map(stocks.map((s) => [s.productId, s]));

  type BuiltLine = {
    productId: string;
    name: string;
    quantity: ReturnType<typeof D>;
    unitPrice: ReturnType<typeof D>;
    amount: ReturnType<typeof D>;
  };

  const built: BuiltLine[] = [];
  const needByProduct = new Map<string, ReturnType<typeof D>>();

  for (const item of parsed.data.items) {
    const product = byId.get(item.productId);
    if (!product) return { error: "Изделие не найдено." };
    const qtyVal = D(item.quantity);
    const price = D(item.unitPrice);
    if (!qtyVal.gt(0)) return { error: "Укажите количество." };
    if (price.lt(0)) return { error: "Цена некорректна." };
    const amount = qtyVal.mul(price);
    built.push({
      productId: product.id,
      name: product.name,
      quantity: qtyVal,
      unitPrice: price,
      amount,
    });
    needByProduct.set(product.id, (needByProduct.get(product.id) ?? D(0)).plus(qtyVal));
  }

  const mergedBuilt: typeof built = [];
  const mergedMap = new Map<string, (typeof built)[0]>();
  for (const line of built) {
    const prev = mergedMap.get(line.productId);
    if (!prev) {
      mergedMap.set(line.productId, { ...line });
      continue;
    }
    const totalQty = prev.quantity.plus(line.quantity);
    const totalAmount = prev.amount.plus(line.amount);
    mergedMap.set(line.productId, {
      ...prev,
      quantity: totalQty,
      amount: totalAmount,
      unitPrice: totalAmount.div(totalQty),
    });
  }
  mergedBuilt.push(...mergedMap.values());

  for (const [productId, need] of needByProduct) {
    const product = byId.get(productId)!;
    const stock = stockByProduct.get(productId);
    const avail = stock ? available(stock.qtyOnHand, stock.qtyReserved) : D(0);
    if (avail.lt(need)) {
      return {
        error: `На складе ГП не хватает «${product.name}»: нужно ${qtyDisplay(need)} ${product.saleUnit.symbol}, есть ${qtyDisplay(avail)}.`,
      };
    }
  }

  const orderTotal = mergedBuilt.reduce((sum, line) => sum.plus(line.amount), D(0));
  const outputQty = mergedBuilt.reduce((sum, line) => sum.plus(line.quantity), D(0));
  let materialCostTotal = D(0);
  for (const line of mergedBuilt) {
    const product = byId.get(line.productId)!;
    const version = product.recipe?.versions[0];
    if (version) {
      const scale = scaleNeed(product.recipeBaseQty, line.quantity);
      const cost = materialCostForRecipe(version.items, Number(scale.toString()));
      if (cost.total) materialCostTotal = materialCostTotal.plus(D(cost.total));
    }
  }
  const laborAmountTotal = D(
    laborAmountForLines(
      mergedBuilt.map((line) => ({
        quantity: line.quantity,
      })),
    ),
  );

  const payMode = parsed.data.payMode;
  const payChannel = parsed.data.payChannel;
  let cardPaid = D(parsed.data.cardAmount || "0");
  let cashPaid = D(parsed.data.cashAmount || "0");
  let paidRaw = cardPaid.plus(cashPaid);

  if (payMode === "debt") {
    paidRaw = D(0);
    cardPaid = D(0);
    cashPaid = D(0);
  } else if (payMode === "paid") {
    if (!paidRaw.eq(orderTotal)) {
      return { error: "Сумма оплаты должна равняться итогу." };
    }
  } else {
    if (!paidRaw.gt(0)) return { error: "Укажите полученную сумму." };
    if (paidRaw.gte(orderTotal)) return { error: "Частичная оплата должна быть меньше итога." };
  }

  if (payChannel !== "cash" && cardPaid.gt(0)) {
    const cards = await loadPaymentCards();
    const card = cards.find((c) => c.id === parsed.data.cardId);
    if (!card) return { error: "Выберите карту для оплаты." };
  }

  const paymentMethod =
    payMode === "debt"
      ? null
      : cardPaid.gt(0) && cashPaid.gt(0)
        ? "mixed"
        : cardPaid.gt(0)
          ? `card:${parsed.data.cardId}`
          : "cash";

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
  const idempotencyKey = String(formData.get("idempotencyKey") ?? randomUUID()).trim() || randomUUID();
  const payKey = `${idempotencyKey}-pay`;

  if (paidRaw.gt(0)) {
    const existingPay = await prisma.payment.findUnique({
      where: { idempotencyKey: payKey },
      select: { orderId: true },
    });
    if (existingPay) {
      revalidatePath("/orders");
      revalidatePath("/orders/quick");
      revalidatePath("/warehouse");
      return { ok: true, id: existingPay.orderId };
    }
  }

  const cards = await loadPaymentCards();
  const selectedCard = cards.find((c) => c.id === parsed.data.cardId);

  let orderId = "";
  try {
    await prisma.$transaction(async (tx) => {
      const order = await tx.order.create({
        data: {
          number,
          customerId,
          sellerId: session.user.id,
          statusId: inFgStatus.id,
          paymentStatus: paymentStatusOf(orderTotal, paidRaw, false),
          paymentMethod,
          discountPercent: 0,
          discountAmount: 0,
          subtotal: orderTotal.toFixed(4),
          total: orderTotal.toFixed(4),
          paidAmount: paidRaw.toFixed(4),
          outputQty: outputQty.toFixed(6),
          materialCost: money(materialCostTotal),
          canProduceFully: true,
          confirmedAt: new Date(),
          dueAt: null,
          createdById: session.user.id,
          items: {
            create: mergedBuilt.map((line) => ({
              productId: line.productId,
              quantity: line.quantity.toFixed(6),
              unitPrice: line.unitPrice.toFixed(4),
              amount: line.amount.toFixed(4),
              outputQty: line.quantity.toFixed(6),
            })),
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

      async function recordPayment(amount: ReturnType<typeof D>, method: string, suffix: string, note: string) {
        if (!amount.gt(0)) return;
        const key = `${payKey}-${suffix}`;
        const payment = await tx.payment.create({
          data: {
            orderId: order.id,
            amount: amount.toFixed(4),
            method,
            comment: note,
            idempotencyKey: key,
            createdById: session.user.id,
          },
        });
        await postClientPayment(tx, {
          orderId: order.id,
          paymentId: payment.id,
          amount: money(amount),
          method,
          orderTotal: money(orderTotal),
          materialCost: money(materialCostTotal),
          laborAmount: money(laborAmountTotal),
          commissionAmount: "0",
          userId: session.user.id,
        });
      }

      if (cardPaid.gt(0)) {
        const cardMethod = `card:${parsed.data.cardId}`;
        const cardLabel = selectedCard ? `${selectedCard.bank} (${selectedCard.name})` : "Карта";
        await recordPayment(
          cardPaid,
          cardMethod,
          "card",
          parsed.data.comment?.trim() || `Оплата на карту: ${cardLabel}`,
        );
      }
      if (cashPaid.gt(0)) {
        await recordPayment(
          cashPaid,
          "cash",
          "cash",
          parsed.data.comment?.trim() || (payMode === "partial" ? "Частичная оплата (нал)" : "Быстрая продажа (нал)"),
        );
      }
    });
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") {
      const raced = await prisma.payment.findUnique({
        where: { idempotencyKey: payKey },
        select: { orderId: true },
      });
      if (raced) {
        revalidatePath("/orders");
        revalidatePath("/orders/quick");
        revalidatePath("/warehouse");
        return { ok: true, id: raced.orderId };
      }
    }
    return { error: e instanceof Error ? e.message : "Не удалось оформить продажу." };
  }

  await writeAudit({
    userId: session.user.id,
    action: "order.quick_sale",
    entityType: "order",
    entityId: orderId,
    newValue: {
      lines: mergedBuilt.map((l) => ({
        productId: l.productId,
        quantity: l.quantity.toFixed(6),
        amount: l.amount.toFixed(4),
      })),
      total: orderTotal.toFixed(4),
      customerId,
      payMode,
      payChannel,
      cardPaid: cardPaid.toFixed(4),
      cashPaid: cashPaid.toFixed(4),
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
