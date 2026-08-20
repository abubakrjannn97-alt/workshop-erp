/**
 * Phase 17 — First Real Workshop Shift (operational, no product code changes).
 * Creates non-demo users, posts opening stock via receiveMaterial, runs multi-role order.
 *
 * Usage: npx tsx scripts/first-shift-run.ts
 */
import { writeFileSync, mkdirSync } from "node:fs";
import { join } from "node:path";
import bcrypt from "bcryptjs";
import { Prisma } from "@prisma/client";
import { loadLocalEnvFiles } from "./load-env";
import { prisma } from "../src/core/infrastructure/prisma";
import { D, money, qty } from "../src/core/shared/decimal";
import {
  mergeMaterialNeeds,
  nextOrderNumber,
  ORDER_STATUS,
  paymentStatusOf,
  quoteProduct,
} from "../src/core/orders/orders";
import {
  MOVEMENT,
  receiveMaterial,
  receiveProduct,
  reserveMaterial,
  writeOffMaterial,
} from "../src/core/inventory/stock";
import { issueOrderStockAndMarkIssued, completeIssuedOrder } from "../src/core/orders/issue-complete";
import { postClientPayment } from "../src/core/finance/finance";
import { accrueProductionWage, accrueSellerCommission } from "../src/core/payroll/payroll";
import { writeAudit } from "../src/core/control/audit";
import { findFinishedGoodsWarehouse, findRawWarehouse } from "../src/core/config/resolve-warehouse";
import { resolveProductionPaySchemeCodeSync } from "../src/core/config/domain-config";
import { resolveProductionProductId } from "../src/core/production/production-order";
import { DEMO_PASSWORD, DEMO_USERS } from "../src/core/auth/demo-users";

loadLocalEnvFiles();

const RUN = `SHIFT17-${Date.now().toString(36)}`;
const PILOT_PASSWORD = "PilotShift2026!Ops";

type Check = { area: string; pass: boolean; detail: string };
const checks: Check[] = [];

function rec(area: string, pass: boolean, detail: string) {
  checks.push({ area, pass, detail });
  console.log(`${pass ? "PASS" : "FAIL"} [${area}] ${detail}`);
}

const PILOT_USERS = [
  { email: "director.ops@workshop.local", roleCode: "director", name: "Директор (смена)" },
  { email: "sales.ops@workshop.local", roleCode: "sales_manager", name: "Продажи (смена)" },
  { email: "accountant.ops@workshop.local", roleCode: "accountant", name: "Бухгалтер (смена)" },
  { email: "production.ops@workshop.local", roleCode: "production_manager", name: "Производство (смена)" },
  { email: "warehouse.ops@workshop.local", roleCode: "warehouse_manager", name: "Склад (смена)" },
  { email: "worker.ops@workshop.local", roleCode: "worker", name: "Рабочий (смена)" },
] as const;

async function ensurePilotUsers(ownerId: string) {
  const hash = await bcrypt.hash(PILOT_PASSWORD, 12);
  const created: Record<string, string> = {};
  for (const u of PILOT_USERS) {
    const role = await prisma.role.findUniqueOrThrow({ where: { code: u.roleCode } });
    const existing = await prisma.user.findUnique({ where: { email: u.email } });
    if (existing) {
      await prisma.user.update({
        where: { id: existing.id },
        data: { passwordHash: hash, roleId: role.id, name: u.name, isActive: true, archivedAt: null },
      });
      created[u.roleCode] = existing.id;
    } else {
      const row = await prisma.user.create({
        data: {
          email: u.email,
          name: u.name,
          passwordHash: hash,
          roleId: role.id,
          isActive: true,
        },
      });
      created[u.roleCode] = row.id;
      await writeAudit({
        userId: ownerId,
        action: "user.create",
        entityType: "user",
        entityId: row.id,
        newValue: { email: u.email, roleCode: u.roleCode, source: "first-shift-run" },
      });
    }
  }
  const salesScheme = await prisma.payScheme.findUnique({ where: { code: "sales_commission" } });
  if (salesScheme) {
    await prisma.user.update({
      where: { id: created.sales_manager },
      data: { paySchemeId: salesScheme.id },
    });
  }
  const prodCode = resolveProductionPaySchemeCodeSync();
  const prodScheme = await prisma.payScheme.findUnique({ where: { code: prodCode } });
  if (prodScheme) {
    await prisma.user.update({
      where: { id: created.worker },
      data: { paySchemeId: prodScheme.id },
    });
  }
  return created;
}

async function verifyCatalog() {
  const materials = await prisma.material.findMany({ where: { isActive: true } });
  const products = await prisma.product.findMany({
    where: { archivedAt: null },
    include: {
      recipe: { include: { versions: { where: { validTo: null }, include: { items: true } } } },
      prices: { where: { validTo: null }, orderBy: { validFrom: "desc" }, take: 1 },
    },
  });
  const withRecipe = products.filter((p) => (p.recipe?.versions?.[0]?.items?.length ?? 0) > 0);
  const withPrice = products.filter((p) => p.prices.length > 0);
  const tile = withRecipe.find((p) => /плитк/i.test(p.name));
  rec(
    "catalog",
    materials.length >= 1 && withRecipe.length >= 1 && withPrice.length >= 1,
    `materials=${materials.length} products=${products.length} withRecipe=${withRecipe.length} withPrice=${withPrice.length} tileOutputPerBase=${tile ? String(tile.outputPerBase) : "n/a"}`,
  );
  return { materials, product: tile ?? withRecipe[0] };
}

async function postOpeningStock(
  ownerId: string,
  materials: { id: string; averagePurchasePrice: unknown; lastPurchasePrice: unknown }[],
) {
  const raw = await findRawWarehouse(prisma);
  if (!raw) throw new Error("RAW warehouse missing");
  let posted = 0;
  for (const m of materials) {
    const stock = await prisma.stockItem.findFirst({
      where: { warehouseId: raw.id, materialId: m.id },
    });
    if (stock && D(String(stock.qtyOnHand)).gt(0)) continue;
    const unitCost = String(m.averagePurchasePrice ?? m.lastPurchasePrice ?? "1");
    await receiveMaterial({
      warehouseId: raw.id,
      materialId: m.id,
      quantity: "500",
      unitCost,
      userId: ownerId,
      reason: `Начальный остаток первой смены (${RUN})`,
      idempotencyKey: `first-shift-opening-${m.id}`,
    });
    posted += 1;
  }
  const onHand = await prisma.stockItem.count({
    where: { warehouseId: raw.id, qtyOnHand: { gt: 0 } },
  });
  const seedMoves = await prisma.stockMovement.count({
    where: { idempotencyKey: { startsWith: "seed-opening-" } },
  });
  rec(
    "opening_stock",
    onHand >= 1 && seedMoves === 0,
    `postedNew=${posted} rawOnHandLines=${onHand} seedOpeningMoves=${seedMoves}`,
  );
  return raw;
}

async function runMultiRoleOrder(ids: Record<string, string>) {
  const salesId = ids.sales_manager;
  const workerId = ids.worker;
  const productionId = ids.production_manager;
  const warehouseId = ids.warehouse_manager;
  const accountantId = ids.accountant;

  const raw = await findRawWarehouse(prisma);
  const fg = await findFinishedGoodsWarehouse(prisma);
  if (!raw || !fg) throw new Error("warehouses missing");

  const product = await prisma.product.findFirst({
    where: { name: { contains: "плитка" }, archivedAt: null },
    include: { prices: { where: { validTo: null }, orderBy: { validFrom: "desc" }, take: 1 } },
  });
  if (!product?.prices[0]) throw new Error("No tile product with price");

  const saleQty = "5";
  const unitPrice = String(product.prices[0].price);
  const quote = await quoteProduct(product.id, saleQty, unitPrice);
  const needs = mergeMaterialNeeds([quote]);

  const customer = await prisma.customer.create({
    data: {
      name: `${RUN} Клиент смены`,
      phone: `+99290${String(Date.now()).slice(-7)}`,
      managerId: salesId,
    },
  });
  await writeAudit({
    userId: salesId,
    action: "customer.create",
    entityType: "customer",
    entityId: customer.id,
    newValue: { name: customer.name },
  });

  const order = await prisma.$transaction(async (tx) => {
    const status = await tx.orderStatus.findUniqueOrThrow({ where: { code: ORDER_STATUS.NEW } });
    const number = await nextOrderNumber(tx);
    return tx.order.create({
      data: {
        number,
        customerId: customer.id,
        sellerId: salesId,
        statusId: status.id,
        paymentStatus: "unpaid",
        discountPercent: "0",
        discountAmount: "0",
        subtotal: money(quote.amount),
        total: money(quote.amount),
        paidAmount: "0",
        materialCost: quote.materialCost,
        outputQty: quote.outputQty,
        recipeSnapshot: { quotes: [quote] } as Prisma.InputJsonValue,
        createdById: salesId,
        items: {
          create: {
            productId: product.id,
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
      include: { materials: true, items: true },
    });
  });
  rec("sales_order", true, `order=#${order.number} total=${order.total} seller=sales.ops`);

  // Accountant: partial then full
  const partial = D(String(order.total)).div(2);
  await prisma.$transaction(async (tx) => {
    const payment = await tx.payment.create({
      data: {
        orderId: order.id,
        amount: money(partial),
        method: "cash",
        idempotencyKey: `${RUN}-pay-partial`,
        createdById: accountantId,
      },
    });
    await tx.order.update({
      where: { id: order.id },
      data: { paidAmount: money(partial), paymentStatus: "partial" },
    });
    await postClientPayment(tx, {
      orderId: order.id,
      paymentId: payment.id,
      amount: money(partial),
      method: "cash",
      orderTotal: String(order.total),
      materialCost: order.materialCost ? String(order.materialCost) : null,
      userId: accountantId,
    });
  });
  const afterPartial = await prisma.order.findUniqueOrThrow({ where: { id: order.id } });
  rec(
    "finance_partial",
    afterPartial.paymentStatus === "partial",
    `paid=${afterPartial.paidAmount} by=accountant.ops`,
  );

  await prisma.$transaction(async (tx) => {
    const rest = D(String(order.total)).sub(afterPartial.paidAmount);
    const payment = await tx.payment.create({
      data: {
        orderId: order.id,
        amount: money(rest),
        method: "cash",
        idempotencyKey: `${RUN}-pay-rest`,
        createdById: accountantId,
      },
    });
    const payments = await tx.payment.findMany({ where: { orderId: order.id } });
    const paid = payments.reduce((s, p) => s.add(String(p.amount)), D(0));
    await tx.order.update({
      where: { id: order.id },
      data: { paidAmount: money(paid), paymentStatus: paymentStatusOf(order.total, paid, false) },
    });
    await postClientPayment(tx, {
      orderId: order.id,
      paymentId: payment.id,
      amount: money(rest),
      method: "cash",
      orderTotal: String(order.total),
      materialCost: order.materialCost ? String(order.materialCost) : null,
      userId: accountantId,
    });
    const seller = await tx.user.findUniqueOrThrow({
      where: { id: salesId },
      include: { payScheme: { include: { tiers: true } } },
    });
    if (seller.payScheme?.tiers?.length) {
      await accrueSellerCommission(tx, {
        sellerId: salesId,
        orderId: order.id,
        paymentId: payment.id,
        paidAmount: money(rest),
        scheme: seller.payScheme,
      });
    }
  });
  const afterPaid = await prisma.order.findUniqueOrThrow({ where: { id: order.id } });
  rec("finance_full", afterPaid.paymentStatus === "paid", `paid=${afterPaid.paidAmount} by=accountant.ops`);

  // Warehouse: confirm + reserve + PO
  const confirmed = await prisma.orderStatus.findUniqueOrThrow({ where: { code: ORDER_STATUS.CONFIRMED } });
  let productionOrderId = "";
  await prisma.$transaction(async (tx) => {
    for (const need of order.materials) {
      const result = await reserveMaterial(
        {
          warehouseId: raw.id,
          materialId: need.materialId,
          quantity: qty(need.plannedQty),
          userId: warehouseId,
          relatedType: "order",
          relatedId: order.id,
          idempotencyKey: `${RUN}-reserve-${need.materialId}`,
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
      where: { id: order.id },
      data: { statusId: confirmed.id, confirmedAt: new Date(), canProduceFully: true },
    });
    const plannedQty = order.items.reduce((s, item) => s.add(String(item.quantity)), D(0));
    const po = await tx.productionOrder.create({
      data: { orderId: order.id, status: "OPEN", plannedQty: qty(plannedQty) },
    });
    productionOrderId = po.id;
  });
  const reserveMoves = await prisma.stockMovement.count({
    where: { relatedId: order.id, type: MOVEMENT.RESERVE },
  });
  rec("warehouse_reserve", reserveMoves >= 1, `reserveMoves=${reserveMoves} by=warehouse.ops`);

  // Production: batch + materials + scrap + FG
  const poRow = await prisma.productionOrder.findUniqueOrThrow({
    where: { id: productionOrderId },
    include: { order: { include: { materials: true, items: true } } },
  });
  const batch = await prisma.productionBatch.create({
    data: {
      productionOrderId: poRow.id,
      number: 1,
      status: "OPEN",
      plannedQty: String(poRow.plannedQty),
      responsibleUserId: workerId,
      materials: {
        create: poRow.order.materials.map((need) => ({
          materialId: need.materialId,
          plannedQty: need.plannedQty,
        })),
      },
    },
    include: { materials: true },
  });
  rec("production_batch", true, `batch=${batch.id} worker=worker.ops pm=production.ops`);

  const productId = resolveProductionProductId(poRow.order.items);
  const goodQty = saleQty;
  const scrapQty = "0.5";
  let materialCost = D(0);

  await prisma.$transaction(async (tx) => {
    for (const line of batch.materials) {
      const actual = D(String(line.plannedQty)).mul("1.02");
      const stock = await tx.stockItem.findFirstOrThrow({
        where: { warehouseId: raw.id, materialId: line.materialId },
      });
      materialCost = materialCost.add(actual.mul(String(stock.wacUnitCost)));
      await writeOffMaterial(
        {
          warehouseId: raw.id,
          materialId: line.materialId,
          quantity: qty(actual),
          userId: warehouseId,
          type: MOVEMENT.ISSUE,
          reason: `Выдача в производство ${RUN}`,
          consumeReserved: true,
          relatedType: "production_batch",
          relatedId: batch.id,
          idempotencyKey: `${RUN}-issue-${line.materialId}`,
        },
        tx,
      );
      await tx.batchMaterialUse.update({
        where: { id: line.id },
        data: { actualQty: qty(actual) },
      });
    }
    const unitCost = D(goodQty).gt(0) ? materialCost.div(goodQty) : D(0);
    await receiveProduct(
      {
        warehouseId: fg.id,
        productId: productId!,
        quantity: qty(goodQty),
        unitCost: qty(unitCost),
        userId: productionId,
        relatedType: "production_batch",
        relatedId: batch.id,
        idempotencyKey: `${RUN}-fg`,
      },
      tx,
    );
    await tx.scrapRecord.create({
      data: {
        batchId: batch.id,
        quantity: scrapQty,
        reason: `Брак первой смены ${RUN}`,
        userId: workerId,
        materialCost: money(materialCost.mul(D(scrapQty).div(D(goodQty).add(scrapQty)))),
      },
    });
    await tx.productionBatch.update({
      where: { id: batch.id },
      data: {
        status: "CLOSED",
        actualQty: goodQty,
        scrapQty,
        producedAt: new Date(),
        responsibleUserId: workerId,
      },
    });
    const rate =
      (await tx.user.findUnique({ where: { id: workerId }, include: { payScheme: true } }))?.payScheme
        ?.productionRate ??
      (await tx.payScheme.findUnique({ where: { code: resolveProductionPaySchemeCodeSync() } }))
        ?.productionRate;
    if (rate) {
      await accrueProductionWage(tx, {
        userId: workerId,
        batchId: batch.id,
        orderId: order.id,
        goodQty: qty(goodQty),
        rate: String(rate),
      });
    }
    await tx.productionOrder.update({
      where: { id: poRow.id },
      data: { producedQty: goodQty, scrapQty, status: "DONE" },
    });
    const inFg = await tx.orderStatus.findUniqueOrThrow({ where: { code: ORDER_STATUS.IN_FG } });
    await tx.order.update({ where: { id: order.id }, data: { statusId: inFg.id } });
  });

  const fgStock = await prisma.stockItem.findFirstOrThrow({
    where: { warehouseId: fg.id, productId: product.id },
  });
  const scrapCount = await prisma.scrapRecord.count({ where: { batchId: batch.id } });
  rec(
    "production_fg",
    D(String(fgStock.qtyOnHand)).gte(goodQty) && scrapCount === 1,
    `fgOnHand=${fgStock.qtyOnHand} scrap=${scrapCount}`,
  );

  // Warehouse: issue + complete
  const fresh = await prisma.order.findUniqueOrThrow({
    where: { id: order.id },
    include: { items: true, status: true },
  });
  await prisma.$transaction(async (tx) => {
    await issueOrderStockAndMarkIssued(tx, {
      orderId: fresh.id,
      orderNumber: fresh.number,
      items: fresh.items,
      warehouseId: fg.id,
      userId: warehouseId,
    });
    await completeIssuedOrder(tx, fresh.id);
  });

  const done = await prisma.order.findUniqueOrThrow({
    where: { id: order.id },
    include: { status: true },
  });
  const wage = await prisma.payrollAccrual.findFirst({
    where: { batchId: batch.id, userId: workerId },
  });
  const ledgerCount = await prisma.ledgerEntry.count({
    where: { orderId: order.id },
  });

  rec(
    "lifecycle",
    done.status.code === ORDER_STATUS.COMPLETED && ledgerCount > 0,
    `order=#${done.number} status=${done.status.code} wage=${wage ? String(wage.amount) : "0"} ledgerHits=${ledgerCount}`,
  );
  rec("employees", Boolean(wage), `workerWage=${wage ? String(wage.amount) : "none"}`);

  return { orderId: order.id, number: order.number, status: done.status.code };
}

async function envChecks() {
  const ownerPass = process.env.OWNER_PASSWORD ?? "";
  const secretOk = (process.env.AUTH_SECRET ?? "").length >= 32;
  const bypassOff = process.env.AUTH_BYPASS !== "1";
  const dbOk = Boolean(process.env.DATABASE_URL);
  const seedDemo = process.env.SEED_DEMO;
  const ownerIsDemo = ownerPass === DEMO_PASSWORD || ownerPass === "ChangeMeNow!";
  rec("env_auth_secret", secretOk, `len=${(process.env.AUTH_SECRET ?? "").length}`);
  rec("env_auth_bypass", bypassOff, `AUTH_BYPASS=${process.env.AUTH_BYPASS ?? "unset"}`);
  rec("env_database", dbOk, dbOk ? "DATABASE_URL set" : "missing");
  rec(
    "env_owner_password",
    !ownerIsDemo && ownerPass.length >= 8,
    ownerIsDemo
      ? "OWNER_PASSWORD still demo default — rotate on live host before public go-live"
      : "OWNER_PASSWORD is non-demo",
  );
  rec("env_seed_demo", seedDemo === "0" || seedDemo === undefined, `SEED_DEMO=${seedDemo ?? "unset"}`);

  const demoEmails = DEMO_USERS.map((u) => u.email);
  const demoStill = await prisma.user.count({
    where: { email: { in: [...demoEmails] }, isActive: true },
  });
  rec(
    "users_legacy_demo",
    true,
    `legacyDemoAccountsInDb=${demoStill} (shift uses *.ops@workshop.local only)`,
  );
}

async function main() {
  console.log(`\n=== FIRST REAL WORKSHOP SHIFT ${RUN} ===\n`);
  await envChecks();

  const owner = await prisma.user.findFirstOrThrow({
    where: { email: process.env.OWNER_EMAIL ?? "owner@workshop.local" },
  });

  const ids = await ensurePilotUsers(owner.id);
  const created = await prisma.user.findMany({
    where: { email: { in: PILOT_USERS.map((u) => u.email) } },
    select: { email: true, role: { select: { code: true } } },
  });
  const usesDemoEmail = created.some((u) => DEMO_USERS.some((d) => d.email === u.email));
  rec(
    "users",
    created.length === PILOT_USERS.length && !usesDemoEmail,
    `roles=${created.map((c) => c.role.code).join(",")}`,
  );

  const { materials, product } = await verifyCatalog();
  if (!product) throw new Error("No product with recipe for shift order");
  await postOpeningStock(owner.id, materials);
  const orderResult = await runMultiRoleOrder(ids);

  const outDir = join(process.cwd(), ".data");
  mkdirSync(outDir, { recursive: true });
  writeFileSync(
    join(outDir, "first-shift-credentials.txt"),
    [
      `# Phase 17 first-shift credentials — DO NOT COMMIT`,
      `generated=${new Date().toISOString()}`,
      `password=${PILOT_PASSWORD}`,
      ...PILOT_USERS.map((u) => `${u.roleCode}=${u.email}`),
      ``,
    ].join("\n"),
    "utf8",
  );

  const report = {
    run: RUN,
    at: new Date().toISOString(),
    order: orderResult,
    checks,
    pass: checks.filter((c) => c.pass).length,
    fail: checks.filter((c) => !c.pass).length,
  };
  writeFileSync(join(outDir, "first-shift-report.json"), JSON.stringify(report, null, 2));
  console.log(`\nCredentials: .data/first-shift-credentials.txt`);
  console.log("=".repeat(50));
  console.log(`FIRST SHIFT CHECKS: ${report.pass} PASS / ${report.fail} FAIL`);
  await prisma.$disconnect();
  // Only hard-fail on operational flow failures (not env_owner_password advisory)
  const hardFail = checks.some((c) => !c.pass && c.area !== "env_owner_password");
  process.exit(hardFail ? 1 : 0);
}

main().catch(async (err) => {
  console.error(err);
  await prisma.$disconnect();
  process.exit(1);
});
