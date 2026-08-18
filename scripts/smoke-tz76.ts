/**
 * Smoke test for TZ.md §76 scenario (owner flow + RBAC checks).
 * Run: npx tsx scripts/smoke-tz76.ts
 */
import { writeFileSync } from "fs";
import { Prisma } from "@prisma/client";
import { prisma } from "../src/lib/prisma";
import { D, money, qty } from "../src/lib/decimal";
import {
  mergeMaterialNeeds,
  nextOrderNumber,
  ORDER_STATUS,
  paymentStatusOf,
  quoteProduct,
} from "../src/lib/orders";
import { MOVEMENT, reserveMaterial, writeOffMaterial, receiveProduct } from "../src/core/inventory/stock";
import { FUND, fundDelta, postClientPayment } from "../src/lib/finance";
import { accrueProductionWage, accrueSellerCommission, commissionPercentNow } from "../src/lib/payroll";
import { hasPermission, ROLE_PERMISSIONS } from "../src/lib/permissions";
import { findFinishedGoodsWarehouse, findRawWarehouse } from "../src/core/config/resolve-warehouse";
import { resolveProductionPaySchemeCode } from "../src/lib/domain-config";
import { resolveProductionProductId } from "../src/core/production/production-order";

type Step = { name: string; ok: boolean; detail?: string };

const steps: Step[] = [];
const issues: string[] = [];

function pass(name: string, detail?: string) {
  steps.push({ name, ok: true, detail });
  console.log(`✓ ${name}${detail ? ` — ${detail}` : ""}`);
}

function fail(name: string, detail: string) {
  steps.push({ name, ok: false, detail });
  issues.push(`${name}: ${detail}`);
  console.error(`✗ ${name} — ${detail}`);
}

function assertEq(name: string, actual: string, expected: string, tolerance = "0.01") {
  const diff = D(actual).sub(expected).abs();
  if (diff.lte(tolerance)) {
    pass(name, `${actual} ≈ ${expected}`);
    return true;
  }
  fail(name, `ожидалось ${expected}, получено ${actual}`);
  return false;
}

async function createOrderFlow(input: {
  ownerId: string;
  sellerId: string;
  customerId: string;
  productId: string;
  quantity: string;
  unitPrice: string;
}) {
  const quote = await quoteProduct(input.productId, input.quantity, input.unitPrice);
  const needs = mergeMaterialNeeds([quote]);
  const subtotal = D(quote.amount);
  const total = subtotal;

  return prisma.$transaction(async (tx) => {
    const status = await tx.orderStatus.findUniqueOrThrow({ where: { code: ORDER_STATUS.NEW } });
    const number = await nextOrderNumber(tx);
    const order = await tx.order.create({
      data: {
        number,
        customerId: input.customerId,
        sellerId: input.sellerId,
        statusId: status.id,
        paymentStatus: "unpaid",
        discountPercent: "0",
        discountAmount: "0",
        subtotal: money(subtotal),
        total: money(total),
        paidAmount: "0",
        materialCost: quote.materialCost,
        outputQty: quote.outputQty,
        recipeSnapshot: { quotes: [quote] } as Prisma.InputJsonValue,
        createdById: input.ownerId,
        items: {
          create: {
            productId: input.productId,
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
      include: { materials: { include: { material: true } }, items: true },
    });
    return { order, quote };
  });
}

async function confirmOrderFlow(orderId: string, userId: string) {
  const order = await prisma.order.findUniqueOrThrow({
    where: { id: orderId },
    include: { status: true, materials: true, items: true, production: true },
  });
  const raw = await findRawWarehouse();
  if (!raw) throw new Error("Склад сырья не найден");
  const confirmed = await prisma.orderStatus.findUniqueOrThrow({ where: { code: ORDER_STATUS.CONFIRMED } });

  await prisma.$transaction(async (tx) => {
    for (const need of order.materials) {
      const result = await reserveMaterial(
        {
          warehouseId: raw.id,
          materialId: need.materialId,
          quantity: qty(need.plannedQty),
          userId,
          relatedType: "order",
          relatedId: order.id,
          idempotencyKey: `smoke-reserve-${order.id}-${need.materialId}`,
          partial: true,
        },
        tx,
      );
      await tx.orderMaterialNeed.update({
        where: { id: need.id },
        data: { reservedQty: result.reserved },
      });
    }
    await tx.order.update({
      where: { id: orderId },
      data: { statusId: confirmed.id, confirmedAt: new Date(), canProduceFully: true },
    });
    if (!order.production) {
      const plannedQty = order.items.reduce((s, item) => s.add(String(item.quantity)), D(0));
      await tx.productionOrder.create({
        data: {
          orderId: order.id,
          status: "OPEN",
          plannedQty: qty(plannedQty),
        },
      });
    }
  });
}

async function addPaymentFlow(orderId: string, amount: string, userId: string, key: string) {
  const order = await prisma.order.findUniqueOrThrow({
    where: { id: orderId },
    include: {
      items: true,
      payments: true,
      seller: { include: { payScheme: { include: { tiers: true } } } },
    },
  });

  const productionSchemeCode = await resolveProductionPaySchemeCode();
  await prisma.$transaction(async (tx) => {
    const payment = await tx.payment.create({
      data: {
        orderId,
        amount: money(amount),
        method: "cash",
        idempotencyKey: key,
        createdById: userId,
      },
    });
    const payments = await tx.payment.findMany({ where: { orderId } });
    const paid = payments.reduce((s, p) => s.add(String(p.amount)), D(0));
    const hadRefund = payments.some((p) => p.reversesId);
    await tx.order.update({
      where: { id: orderId },
      data: { paidAmount: money(paid), paymentStatus: paymentStatusOf(order.total, paid, hadRefund) },
    });
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
      method: "cash",
      orderTotal: String(order.total),
      materialCost: order.materialCost ? String(order.materialCost) : null,
      laborAmount: laborFromProd,
      commissionAmount,
      userId,
    });
  });
}

async function closeBatchFlow(input: {
  batchId: string;
  actualQty: string;
  scrapQty: string;
  userId: string;
  workerId: string;
}) {
  const batch = await prisma.productionBatch.findUniqueOrThrow({
    where: { id: input.batchId },
    include: {
      materials: { include: { material: true } },
      production: { include: { order: { include: { items: true, materials: true } } } },
    },
  });
  const rawWh = await findRawWarehouse();
  const fg = await findFinishedGoodsWarehouse();
  if (!rawWh || !fg) throw new Error("Склады RAW/FG не найдены");
  const productId = resolveProductionProductId(batch.production.order.items);
  if (!productId) throw new Error("Нет изделия в заказе или заказ содержит несколько разных изделий");

  const actuals = batch.materials.map((line) => ({ line, actual: String(line.plannedQty) }));
  const materialCost = actuals.reduce((s, row) => {
    const unit = row.line.material.averagePurchasePrice ?? row.line.material.lastPurchasePrice;
    if (!unit) return s;
    return s.add(D(row.actual).mul(unit));
  }, D(0));
  const good = D(input.actualQty);
  const unitCost = good.gt(0) ? materialCost.div(good) : D(0);
  const productionSchemeCode = await resolveProductionPaySchemeCode();

  await prisma.$transaction(async (tx) => {
    for (const row of actuals) {
      await writeOffMaterial(
        {
          warehouseId: rawWh.id,
          materialId: row.line.materialId,
          quantity: qty(row.actual),
          userId: input.userId,
          type: MOVEMENT.ISSUE,
          reason: `Партия №${batch.number}`,
          consumeReserved: true,
          relatedType: "production_batch",
          relatedId: batch.id,
          idempotencyKey: `smoke-batch-${batch.id}-${row.line.materialId}`,
        },
        tx,
      );
      await tx.batchMaterialUse.update({
        where: { id: row.line.id },
        data: { actualQty: row.actual },
      });
    }
    if (good.gt(0)) {
      await receiveProduct(
        {
          warehouseId: fg.id,
          productId,
          quantity: qty(good),
          unitCost: qty(unitCost),
          userId: input.userId,
          comment: `Выпуск партии №${batch.number}`,
          relatedType: "production_batch",
          relatedId: batch.id,
          idempotencyKey: `smoke-fg-${batch.id}`,
        },
        tx,
      );
    }
    if (D(input.scrapQty).gt(0)) {
      await tx.scrapRecord.create({
        data: {
          batchId: batch.id,
          quantity: input.scrapQty,
          reason: "Отклонение от плана (smoke)",
          userId: input.userId,
          materialCost: money(materialCost.mul(D(input.scrapQty).div(good.add(input.scrapQty)))),
        },
      });
    }
    await tx.productionBatch.update({
      where: { id: batch.id },
      data: {
        status: "CLOSED",
        actualQty: input.actualQty,
        scrapQty: input.scrapQty,
        producedAt: new Date(),
        responsibleUserId: input.workerId,
      },
    });
    const rate =
      (
        await tx.user.findUnique({
          where: { id: input.workerId },
          include: { payScheme: true },
        })
      )?.payScheme?.productionRate ??
      (await tx.payScheme.findUnique({ where: { code: productionSchemeCode } }))?.productionRate;
    if (rate && good.gt(0)) {
      await accrueProductionWage(tx, {
        userId: input.workerId,
        batchId: batch.id,
        orderId: batch.production.orderId,
        goodQty: qty(good),
        rate: String(rate),
      });
    }
    await tx.productionOrder.update({
      where: { id: batch.productionOrderId },
      data: { producedQty: input.actualQty, scrapQty: input.scrapQty, status: "DONE" },
    });
  });
}

function checkRbac() {
  const salesPerms = ROLE_PERMISSIONS.sales_manager ?? [];
  if (hasPermission(salesPerms, "sales_manager", "finance.view")) {
    fail("RBAC sales", "sales_manager не должен видеть finance.view");
  } else {
    pass("RBAC sales", "нет finance.view");
  }
  if (hasPermission(salesPerms, "sales_manager", "materials.manage")) {
    fail("RBAC sales", "sales_manager не должен управлять закупочными ценами");
  } else {
    pass("RBAC sales", "нет materials.manage");
  }

  const workerPerms = ROLE_PERMISSIONS.worker ?? [];
  if (hasPermission(workerPerms, "worker", "orders.create")) {
    fail("RBAC worker", "worker не должен создавать заказы");
  } else {
    pass("RBAC worker", "нет orders.create");
  }
  if (!hasPermission(workerPerms, "worker", "production.report")) {
    fail("RBAC worker", "worker должен подтверждать выработку");
  } else {
    pass("RBAC worker", "есть production.report");
  }

  const whPerms = ROLE_PERMISSIONS.warehouse_manager ?? [];
  if (hasPermission(whPerms, "warehouse_manager", "finance.view")) {
    fail("RBAC warehouse", "кладовщик не должен видеть финансы");
  } else {
    pass("RBAC warehouse", "нет finance.view");
  }
  if (!hasPermission(whPerms, "warehouse_manager", "inventory.receive")) {
    fail("RBAC warehouse", "кладовщик должен принимать на склад");
  } else {
    pass("RBAC warehouse", "есть inventory.receive");
  }
}

async function main() {
  console.log("=== Smoke TZ §76 ===\n");

  const owner = await prisma.user.findFirstOrThrow({
    where: { email: "owner@workshop.local" },
    include: { role: true },
  });
  const sales = await prisma.user.findFirst({
    where: { email: "sales@workshop.local" },
    include: { role: true, payScheme: { include: { tiers: true } } },
  });
  const worker = await prisma.user.findFirst({
    where: { email: "worker@workshop.local" },
    include: { payScheme: true },
  });
  const tile = await prisma.product.findFirstOrThrow({ where: { name: "Фасадная плитка" } });
  const priceRow = await prisma.productPrice.findFirst({
    where: { productId: tile.id, validTo: null },
    orderBy: { validFrom: "desc" },
  });
  if (!priceRow || D(String(priceRow.price)).lte(0)) {
    fail("Seed prices", "цена плитки не задана");
    writeReport();
    process.exit(1);
  }
  pass("Seed prices", `плитка ${priceRow.price} с/м²`);

  const customer = await prisma.customer.create({
    data: { name: `Smoke клиент ${Date.now()}`, phone: "+992900000000", managerId: owner.id },
  });
  pass("1. Клиент", customer.name);

  const quantity = "50";
  const unitPrice = "150";
  const sellerId = sales?.id ?? owner.id;
  const { order, quote } = await createOrderFlow({
    ownerId: owner.id,
    sellerId,
    customerId: customer.id,
    productId: tile.id,
    quantity,
    unitPrice,
  });
  const orderTotal = money(D(quantity).mul(unitPrice));
  assertEq("2. Сумма заказа", String(order.total), orderTotal);
  pass("2. Заказ", `#${order.number}, ${quantity} м²`);

  const orderReloaded = await prisma.order.findUniqueOrThrow({
    where: { id: order.id },
    include: { materials: { include: { material: true } } },
  });
  const materialByName = Object.fromEntries(
    orderReloaded.materials.map((m) => [m.material.name, m]),
  );
  const expectedNeeds: Record<string, string> = {
    "Белый цемент": "350",
    "Краска": "20",
    "Клей": "3",
    "Песок": "50",
  };
  for (const [name, expected] of Object.entries(expectedNeeds)) {
    const line = materialByName[name];
    if (!line) {
      fail("3. Рецептура", `нет материала ${name}`);
      continue;
    }
    assertEq(`3. Норма ${name}`, String(line.plannedQty), expected, name === "Песок" ? "0" : "0.1");
  }

  await confirmOrderFlow(order.id, owner.id);
  const confirmed = await prisma.order.findUniqueOrThrow({
    where: { id: order.id },
    include: { materials: { include: { material: true } }, status: true, production: true },
  });
  if (confirmed.status.code !== ORDER_STATUS.CONFIRMED) {
    fail("3. Confirm", `статус ${confirmed.status.code}`);
  } else {
    pass("3. Confirm", "резерв материалов");
  }
  for (const need of confirmed.materials) {
    if (D(String(need.reservedQty)).lte(0)) {
      fail("3. Резерв", `${need.material.name}: reserved=0`);
    }
  }
  if (!confirmed.production) fail("3. Production order", "не создан");
  else pass("3. Production order", confirmed.production.id);

  const po = confirmed.production!;
  const batch = await prisma.productionBatch.create({
    data: {
      productionOrderId: po.id,
      number: 1,
      status: "OPEN",
      plannedQty: quantity,
      responsibleUserId: worker?.id ?? owner.id,
      materials: {
        create: confirmed.materials.map((need) => ({
          materialId: need.materialId,
          plannedQty: need.plannedQty,
        })),
      },
    },
    include: { materials: true },
  });
  pass("4. Партия", `№${batch.number}, план ${quantity} м²`);

  const actualQty = "48";
  const scrapQty = "2";
  await closeBatchFlow({
    batchId: batch.id,
    actualQty,
    scrapQty,
    userId: owner.id,
    workerId: worker?.id ?? owner.id,
  });
  const wageExpected = money(D(actualQty).mul("22"));
  const wage = await prisma.payrollAccrual.findFirst({
    where: { batchId: batch.id, kind: "PRODUCTION" },
  });
  if (!wage) fail("4. Зарплата", "начисление не найдено");
  else assertEq("4. Зарплата", String(wage.amount), wageExpected);

  const partialAmount = "5000";
  await addPaymentFlow(order.id, partialAmount, owner.id, `smoke-pay-1-${order.id}`);
  const afterPartial = await prisma.order.findUniqueOrThrow({ where: { id: order.id } });
  if (afterPartial.paymentStatus !== "partial") {
    fail("5. Частичная оплата", `статус ${afterPartial.paymentStatus}`);
  } else {
    pass("5. Частичная оплата", `${partialAmount} из ${orderTotal}`);
  }

  const fundsAfterPartial = await fundBalances(order.id);
  pass("5. Фонды (часть)", JSON.stringify(fundsAfterPartial));

  if (sales) {
    const comm = await prisma.payrollAccrual.findFirst({
      where: { orderId: order.id, kind: "COMMISSION", userId: sales.id },
    });
    const pct = await commissionPercentNow(prisma, sales.id, order.id, sales.payScheme!);
    const commExpected = money(D(partialAmount).mul(pct).div(100));
    if (!comm) fail("5. Комиссия", "не начислена");
    else assertEq("5. Комиссия", String(comm.amount), commExpected);
  }

  const rest = money(D(orderTotal).sub(partialAmount));
  await addPaymentFlow(order.id, rest, owner.id, `smoke-pay-2-${order.id}`);
  const afterFull = await prisma.order.findUniqueOrThrow({ where: { id: order.id } });
  if (afterFull.paymentStatus !== "paid") {
    fail("6. Полная оплата", `статус ${afterFull.paymentStatus}`);
  } else {
    pass("6. Полная оплата", `оплачено ${afterFull.paidAmount}`);
  }

  const entries = await prisma.ledgerEntry.findMany({ where: { orderId: order.id, status: "POSTED" } });
  const profitFund = await prisma.financialFund.findUniqueOrThrow({ where: { code: FUND.PROFIT } });
  const profit = entries.reduce((s, e) => s.add(fundDelta(e, profitFund.id)), D(0));

  const matCost = D(String(order.materialCost ?? quote.materialCost ?? "0"));
  const revenue = D(orderTotal);
  const saleQty = D(quantity);
  const laborExpected = saleQty.mul("22");
  const commAccruals = await prisma.payrollAccrual.findMany({
    where: { orderId: order.id, kind: "COMMISSION", status: "ACCRUED" },
  });
  const commTotal = commAccruals.reduce((s, a) => s.add(String(a.amount)), D(0));
  // Оплата полная, opex 0 → фонд прибыли = contribution
  const expectedProfit = revenue.sub(matCost).sub(laborExpected).sub(commTotal);
  if (profit.lte(0)) {
    fail("7. Dashboard profit fund", `ожидалось > 0, получено ${money(profit)}`);
  } else {
    assertEq("7. Dashboard profit fund", money(profit), money(expectedProfit), "0.02");
  }
  pass(
    "7. Contribution",
    `выручка ${money(revenue)} − мат ${money(matCost)} − труд ${money(laborExpected)} − комиссия ${money(commTotal)} = ${money(expectedProfit)}`,
  );
  assertEq("7. Profit vs contribution", money(profit), money(expectedProfit), "0.02");

  checkRbac();
  writeReport();
  if (issues.length > 0) {
    console.error(`\nИтого: ${issues.length} проблем(ы)`);
    process.exit(1);
  }
  console.log(`\nИтого: ${steps.filter((s) => s.ok).length}/${steps.length} OK`);
}

async function fundBalances(orderId: string) {
  const funds = await prisma.financialFund.findMany();
  const entries = await prisma.ledgerEntry.findMany({ where: { orderId, status: "POSTED" } });
  const out: Record<string, string> = {};
  for (const fund of funds) {
    const bal = entries.reduce((s, e) => s.add(fundDelta(e, fund.id)), D(0));
    if (bal.gt(0)) out[fund.code] = money(bal);
  }
  return out;
}

function writeReport() {
  const report = {
    ranAt: new Date().toISOString(),
    steps,
    issues,
    passed: steps.filter((s) => s.ok).length,
    failed: steps.filter((s) => !s.ok).length,
  };
  writeFileSync("scripts/smoke-tz76-report.json", JSON.stringify(report, null, 2));
  console.log("\nОтчёт: scripts/smoke-tz76-report.json");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
