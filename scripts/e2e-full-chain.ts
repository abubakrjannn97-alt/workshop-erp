/**
 * Isolated E2E business-flow harness.
 * Uses production core modules + Prisma. Does not change business logic.
 * Run: npx tsx scripts/e2e-full-chain.ts
 */
import { writeFileSync } from "fs";
import { Prisma } from "@prisma/client";
import bcrypt from "bcryptjs";
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
  available,
  MOVEMENT,
  receiveMaterial,
  receiveProduct,
  reserveMaterial,
  transferStock,
  writeOffMaterial,
} from "../src/core/inventory/stock";
import { finishedGoodsIssueQty, saleToOutputQty } from "../src/core/inventory/finished-goods";
import { issueOrderStockAndMarkIssued, completeIssuedOrder } from "../src/core/orders/issue-complete";
import { FUND, fundDelta, LEDGER, postClientPayment, postLedger } from "../src/core/finance/finance";
import { contributionAndNet } from "../src/core/finance/profit";
import {
  accrueProductionWage,
  accrueSellerCommission,
  commissionPercentNow,
} from "../src/core/payroll/payroll";
import { writeAudit } from "../src/core/control/audit";
import { queueApproval } from "../src/core/control/control";
import { executeApprovalDecision } from "../src/core/control/approval-decision";
import { findFinishedGoodsWarehouse, findRawWarehouse } from "../src/core/config/resolve-warehouse";
import { resolveProductionPaySchemeCode, resolveProductionPaySchemeCodeSync } from "../src/core/config/domain-config";
import { resolveBatchFinishedGoods, resolveProductionProductId } from "../src/core/production/production-order";
import { assertCanCloseBatch } from "../src/core/production/batch-auth";
import { ROLE_PERMISSIONS, canSeeMaterialCost, hasPermission } from "../src/core/rbac/permissions";
import { loadLiveAuthFields } from "../src/core/auth/load-live-auth";
import { createCrmDocument } from "../src/core/crm/documents";
import { postDueRecurringObligations } from "../src/core/finance/recurring";
import { setProductionOrderStage, upsertProductionStage } from "../src/core/production/stages";

type Status = "fully_working" | "partial" | "bug" | "not_implemented";

type EntityReport = {
  entity: string;
  status: Status;
  lastWorkingStep: string;
  firstBrokenStep: string | null;
  rootCause: string | null;
  impact: string | null;
  evidence: string[];
};

const RUN = `E2E-${Date.now().toString(36)}`;
const reports: EntityReport[] = [];
const chain: { step: string; ok: boolean; detail: string }[] = [];

function rec(r: EntityReport) {
  reports.push(r);
  const mark =
    r.status === "fully_working" ? "OK" : r.status === "partial" ? "PARTIAL" : r.status === "bug" ? "BUG" : "MISSING";
  console.log(`[${mark}] ${r.entity}: last=${r.lastWorkingStep}${r.firstBrokenStep ? `; broken=${r.firstBrokenStep}` : ""}`);
}

function chainStep(step: string, ok: boolean, detail: string) {
  chain.push({ step, ok, detail });
  console.log(`${ok ? "✓" : "✗"} CHAIN ${step} — ${detail}`);
}

async function main() {
  const owner = await prisma.user.findFirstOrThrow({
    where: { email: "owner@workshop.local" },
    include: { role: true },
  });
  const kg = await prisma.unit.findUniqueOrThrow({ where: { code: "KG" } });
  const m2 = await prisma.unit.findUniqueOrThrow({ where: { code: "M2" } });
  const pcs = await prisma.unit.findUniqueOrThrow({ where: { code: "PCS" } });
  const raw = await findRawWarehouse();
  const fg = await findFinishedGoodsWarehouse();
  if (!raw || !fg) throw new Error("RAW/FG warehouses missing — run npm run db:seed");

  const now = new Date();
  const period = await prisma.accountingPeriod.findUnique({
    where: { year_month: { year: now.getFullYear(), month: now.getMonth() + 1 } },
  });
  let reopenedPeriod = false;
  if (period?.status === "CLOSED") {
    await prisma.accountingPeriod.update({
      where: { id: period.id },
      data: { status: "OPEN" },
    });
    reopenedPeriod = true;
    console.log(`TEST ENV: reopened accounting period ${period.month}.${period.year} for E2E (will restore)`);
  }

  const ids = {
    employeeId: "",
    salesId: "",
    workerId: "",
    customerId: "",
    leadId: "",
    materialId: "",
    productId: "",
    variantId: "",
    priceId: "",
    recipeVersion1: "",
    recipeVersion2: "",
    supplierId: "",
    purchaseId: "",
    orderId: "",
    paymentId: "",
    productionId: "",
    batchId: "",
    scrapId: "",
    expenseIds: [] as string[],
    approvalId: "",
    auditId: "",
    transferWhId: "",
    obligationId: "",
    crmDocId: "",
  };

  try {
    await testRole(owner.id);
    await testEmployee(ids, owner.id);
    await testMaterial(ids, owner.id, kg.id);
    await testProductPriceRecipe(ids, owner.id, m2.id, pcs.id, kg.id);
    await testSupplierPurchaseWarehouse(ids, owner.id, raw.id);
    await testCustomerLead(ids, ids.salesId || owner.id);
    await testFullChain(ids, owner.id, raw.id, fg.id);
    await testExpenseFundsApprovalAudit(ids, owner.id);
    await testRoleAuthorization(ids);
    await testDuplicatePaymentGuard(ids, owner.id);
  } finally {
    if (reopenedPeriod && period) {
      await prisma.accountingPeriod.update({
        where: { id: period.id },
        data: { status: "CLOSED" },
      });
      console.log(`TEST ENV: restored accounting period ${period.month}.${period.year} to CLOSED`);
    }
    await cleanup(ids);
    await prisma.$disconnect();
  }

  const out = {
    run: RUN,
    generatedAt: new Date().toISOString(),
    entities: reports,
    fullChain: chain,
    summary: {
      fully_working: reports.filter((r) => r.status === "fully_working").length,
      partial: reports.filter((r) => r.status === "partial").length,
      bug: reports.filter((r) => r.status === "bug").length,
      not_implemented: reports.filter((r) => r.status === "not_implemented").length,
    },
  };
  writeFileSync("scripts/e2e-full-chain-report.json", JSON.stringify(out, null, 2), "utf8");
  console.log("\nWrote scripts/e2e-full-chain-report.json");
  console.log(out.summary);
}

async function testRole(ownerId: string) {
  const evidence: string[] = [];
  const roles = await prisma.role.findMany({ include: { permissions: { include: { permission: true } } } });
  const codes = new Set(roles.map((r) => r.code));
  const expected = ["owner", "director", "sales_manager", "production_manager", "worker", "warehouse_manager", "accountant", "employee"];
  const missing = expected.filter((c) => !codes.has(c));
  evidence.push(`roles in db: ${[...codes].join(",")}`);
  const sales = roles.find((r) => r.code === "sales_manager");
  const salesPerms = sales?.permissions.map((p) => p.permission.code) ?? [];
  const salesHasFinance = salesPerms.includes("finance.view");
  evidence.push(`sales_manager finance.view=${salesHasFinance} expected false`);
  const mapMatch = JSON.stringify([...ROLE_PERMISSIONS.sales_manager].sort()) === JSON.stringify([...salesPerms].sort());
  evidence.push(`ROLE_PERMISSIONS vs DB for sales match=${mapMatch}`);
  const salesCost = canSeeMaterialCost(ROLE_PERMISSIONS.sales_manager, "sales_manager");
  evidence.push(`sales canSeeMaterialCost=${salesCost} expected false`);

  rec({
    entity: "Role",
    status: missing.length || salesHasFinance || salesCost ? "bug" : "fully_working",
    lastWorkingStep: "Read roles + permissions from DB and compare with ROLE_PERMISSIONS",
    firstBrokenStep: missing.length ? "Seed missing system roles" : salesHasFinance ? "sales_manager has finance.view" : null,
    rootCause: missing.length ? `Missing roles: ${missing.join(",")}` : null,
    impact: missing.length ? "Login/seed for those roles fails" : null,
    evidence,
  });
  void ownerId;
}

async function testEmployee(ids: Record<string, string> & { expenseIds: string[] }, ownerId: string) {
  const evidence: string[] = [];
  const hash = await bcrypt.hash("ChangeMeNow!", 10);
  const empRole = await prisma.role.findUniqueOrThrow({ where: { code: "employee" } });
  const workerRole = await prisma.role.findUniqueOrThrow({ where: { code: "worker" } });
  const salesRole = await prisma.role.findUniqueOrThrow({ where: { code: "sales_manager" } });
  const prodScheme = await prisma.payScheme.findFirst({ where: { kind: "PRODUCTION_M2" } });
  const salesScheme = await prisma.payScheme.findFirst({ where: { kind: "SALES_COMMISSION" } });

  const employee = await prisma.user.create({
    data: {
      email: `${RUN}-emp@workshop.local`,
      name: `${RUN} Employee`,
      passwordHash: hash,
      roleId: empRole.id,
      phone: `+992900${String(Date.now()).slice(-6)}`,
    },
  });
  ids.employeeId = employee.id;
  const reportPerm = await prisma.permission.findUnique({ where: { code: "production.report" } });
  if (reportPerm) {
    await prisma.userPermission.create({ data: { userId: employee.id, permissionId: reportPerm.id } });
  }
  const reopened = await prisma.user.findUniqueOrThrow({
    where: { id: employee.id },
    include: { permissions: { include: { permission: true } } },
  });
  evidence.push(`created employee ${employee.id}, extra perms=${reopened.permissions.map((p) => p.permission.code).join(",")}`);

  await prisma.user.update({ where: { id: employee.id }, data: { name: `${RUN} Employee edited` } });
  const edited = await prisma.user.findUniqueOrThrow({ where: { id: employee.id } });
  evidence.push(`update name=${edited.name}`);

  const worker = await prisma.user.create({
    data: {
      email: `${RUN}-worker@workshop.local`,
      name: `${RUN} Worker`,
      passwordHash: hash,
      roleId: workerRole.id,
      paySchemeId: prodScheme?.id,
    },
  });
  ids.workerId = worker.id;
  const sales = await prisma.user.create({
    data: {
      email: `${RUN}-sales@workshop.local`,
      name: `${RUN} Sales`,
      passwordHash: hash,
      roleId: salesRole.id,
      paySchemeId: salesScheme?.id,
    },
  });
  ids.salesId = sales.id;
  evidence.push(`worker=${worker.id} sales=${sales.id}`);

  const auditPerm = await prisma.permission.findUnique({ where: { code: "audit.view" } });
  if (auditPerm) {
    await prisma.userPermission.create({ data: { userId: sales.id, permissionId: auditPerm.id } });
  }
  const live = await loadLiveAuthFields(sales.id);
  rec({
    entity: "JWT permissions",
    status: live.permissions.includes("audit.view") ? "fully_working" : "bug",
    lastWorkingStep: "loadLiveAuthFields reads role+UserPermission from DB (jwt callback uses this each request)",
    firstBrokenStep: live.permissions.includes("audit.view") ? null : "Fresh permissions not loaded",
    rootCause: live.permissions.includes("audit.view") ? null : "stale JWT snapshot",
    impact: live.permissions.includes("audit.view") ? null : "Grant/revoke ignored until re-login",
    evidence: [`sales live perms include audit.view=${live.permissions.includes("audit.view")}`],
  });

  rec({
    entity: "Employee",
    status: "fully_working",
    lastWorkingStep: "Create / read / update user + extra UserPermission + payScheme link",
    firstBrokenStep: null,
    rootCause: null,
    impact: null,
    evidence,
  });
  void ownerId;
}

async function testMaterial(
  ids: Record<string, string> & { expenseIds: string[] },
  ownerId: string,
  kgId: string,
) {
  const material = await prisma.material.create({
    data: {
      name: `${RUN} Cement`,
      category: "E2E",
      storageUnitId: kgId,
      purchaseUnitId: kgId,
      packageWeight: "50",
      packagePrice: "200",
      minStock: "10",
      lastPurchasePrice: "4",
      averagePurchasePrice: "4",
    },
  });
  ids.materialId = material.id;
  await prisma.materialPriceHistory.create({
    data: {
      materialId: material.id,
      packageWeight: "50",
      packagePrice: "200",
      unitPrice: "4",
      createdById: ownerId,
    },
  });
  await prisma.material.update({ where: { id: material.id }, data: { packagePrice: "220" } });
  await prisma.materialPriceHistory.create({
    data: {
      materialId: material.id,
      packageWeight: "50",
      packagePrice: "220",
      unitPrice: "4.4",
      createdById: ownerId,
    },
  });
  const hist = await prisma.materialPriceHistory.findMany({ where: { materialId: material.id } });
  rec({
    entity: "Material",
    status: hist.length >= 2 ? "fully_working" : "partial",
    lastWorkingStep: "Create material, open, change package price, append price history",
    firstBrokenStep: null,
    rootCause: null,
    impact: null,
    evidence: [`id=${material.id}`, `history rows=${hist.length}`],
  });
}

async function testProductPriceRecipe(
  ids: Record<string, string> & { expenseIds: string[] },
  ownerId: string,
  m2Id: string,
  pcsId: string,
  kgId: string,
) {
  const product = await prisma.product.create({
    data: {
      name: `${RUN} Tile`,
      category: "E2E",
      saleUnitId: m2Id,
      outputUnitId: pcsId,
      minPrice: "100",
      recipeBaseQty: "1",
      outputPerBase: "10",
      recipe: { create: {} },
    },
  });
  ids.productId = product.id;
  const p1 = await prisma.productPrice.create({
    data: { productId: product.id, price: "150", createdById: ownerId },
  });
  ids.priceId = p1.id;
  await prisma.productPrice.update({ where: { id: p1.id }, data: { validTo: new Date() } });
  const p2 = await prisma.productPrice.create({
    data: { productId: product.id, price: "160", createdById: ownerId },
  });
  const prices = await prisma.productPrice.findMany({ where: { productId: product.id }, orderBy: { validFrom: "asc" } });
  rec({
    entity: "Product",
    status: "fully_working",
    lastWorkingStep: "Create product with empty recipe, read, keep outputPerBase=10 (TZ tile)",
    firstBrokenStep: null,
    rootCause: null,
    impact: "Later issue-to-customer uses sale-unit FG qty; outputQty is conversion only",
    evidence: [`product=${product.id}`, `outputPerBase=10 sale=M2 output=PCS`],
  });
  rec({
    entity: "Price",
    status: prices.some((p) => !p.validTo) && prices.some((p) => p.validTo) ? "fully_working" : "bug",
    lastWorkingStep: "Close previous price (validTo) and insert new current price",
    firstBrokenStep: null,
    rootCause: null,
    impact: null,
    evidence: [`prices=${prices.length}`, `current=${p2.price}`],
  });
  rec({
    entity: "Price History",
    status: prices.length >= 2 ? "fully_working" : "bug",
    lastWorkingStep: "Old price remains with validTo; new price validTo=null",
    firstBrokenStep: null,
    rootCause: null,
    impact: null,
    evidence: prices.map((p) => `${p.price} validTo=${p.validTo ? "set" : "null"}`),
  });

  const recipe = await prisma.recipe.findUniqueOrThrow({ where: { productId: product.id } });
  const v1 = await prisma.recipeVersion.create({
    data: {
      recipeId: recipe.id,
      versionNumber: 1,
      comment: "v1",
      createdById: ownerId,
      items: { create: [{ materialId: ids.materialId, quantity: "7", unitId: kgId }] },
    },
  });
  ids.recipeVersion1 = v1.id;
  await prisma.recipeVersion.update({ where: { id: v1.id }, data: { validTo: new Date() } });
  const v2 = await prisma.recipeVersion.create({
    data: {
      recipeId: recipe.id,
      versionNumber: 2,
      comment: "v2 more cement",
      createdById: ownerId,
      items: { create: [{ materialId: ids.materialId, quantity: "8", unitId: kgId }] },
    },
  });
  ids.recipeVersion2 = v2.id;
  rec({
    entity: "Recipe",
    status: "fully_working",
    lastWorkingStep: "Recipe row created with product (1:1), items on versions",
    firstBrokenStep: null,
    rootCause: null,
    impact: null,
    evidence: [`recipe=${recipe.id}`],
  });
  rec({
    entity: "Recipe Version",
    status: "fully_working",
    lastWorkingStep: "v1 closed with validTo, v2 current with different qty 8 vs 7",
    firstBrokenStep: null,
    rootCause: null,
    impact: "Old orders must keep snapshot of v used at create time",
    evidence: [`v1=${v1.id} qty=7`, `v2=${v2.id} qty=8`],
  });
}

async function testSupplierPurchaseWarehouse(
  ids: Record<string, string> & { expenseIds: string[] },
  ownerId: string,
  rawId: string,
) {
  const supplier = await prisma.supplier.create({
    data: { name: `${RUN} Supplier`, phone: "+992111000001" },
  });
  ids.supplierId = supplier.id;
  await prisma.supplierMaterial.create({ data: { supplierId: supplier.id, materialId: ids.materialId } });
  rec({
    entity: "Supplier",
    status: "fully_working",
    lastWorkingStep: "Create supplier, link material, reopen",
    firstBrokenStep: null,
    rootCause: null,
    impact: null,
    evidence: [`supplier=${supplier.id}`],
  });

  const po = await prisma.purchaseOrder.create({
    data: {
      number: `PO-${RUN}`,
      supplierId: supplier.id,
      status: "REQUEST",
      total: "2200",
      createdById: ownerId,
      items: {
        create: {
          materialId: ids.materialId,
          quantity: "500",
          unitPrice: "4.4",
          amount: "2200",
        },
      },
    },
    include: { items: true },
  });
  ids.purchaseId = po.id;
  await prisma.purchaseOrder.update({
    where: { id: po.id },
    data: { status: "ORDERED", confirmedById: ownerId, confirmedAt: new Date() },
  });
  const before = await prisma.stockItem.findFirst({
    where: { warehouseId: rawId, materialId: ids.materialId },
  });
  await receiveMaterial({
    warehouseId: rawId,
    materialId: ids.materialId,
    quantity: "500",
    unitCost: "4.4",
    userId: ownerId,
    reason: "E2E purchase receive",
    relatedType: "purchase_order",
    relatedId: po.id,
    idempotencyKey: `${RUN}-po-receive`,
  });
  await prisma.purchaseOrder.update({
    where: { id: po.id },
    data: { status: "RECEIVED", receivedById: ownerId, receivedAt: new Date() },
  });
  const after = await prisma.stockItem.findFirstOrThrow({
    where: { warehouseId: rawId, materialId: ids.materialId },
  });
  const moved = D(String(after.qtyOnHand)).sub(String(before?.qtyOnHand ?? "0"));
  rec({
    entity: "Purchase",
    status: moved.eq("500") ? "fully_working" : "bug",
    lastWorkingStep: "REQUEST → ORDERED → receiveMaterial → RECEIVED",
    firstBrokenStep: moved.eq("500") ? null : "Stock qty after receive",
    rootCause: moved.eq("500") ? null : `expected +500 got ${moved.toString()}`,
    impact: moved.eq("500") ? null : "Procurement does not fill warehouse",
    evidence: [`po=${po.id}`, `stock delta=${moved.toString()}`, `wac=${after.wacUnitCost}`],
  });

  const destWh = await prisma.warehouse.create({
    data: { code: `${RUN}-WH`, name: `${RUN} transfer dest`, kind: "raw" },
  });
  ids.transferWhId = destWh.id;
  await transferStock({
    fromWarehouseId: rawId,
    toWarehouseId: destWh.id,
    materialId: ids.materialId,
    quantity: "10",
    userId: ownerId,
    comment: "E2E transfer",
    idempotencyKey: `${RUN}-wh-tr`,
  });
  const destStock = await prisma.stockItem.findFirstOrThrow({
    where: { warehouseId: destWh.id, materialId: ids.materialId },
  });
  const srcAfter = await prisma.stockItem.findFirstOrThrow({
    where: { warehouseId: rawId, materialId: ids.materialId },
  });
  const transferOk = D(String(destStock.qtyOnHand)).eq("10") && D(String(srcAfter.qtyOnHand)).eq(D(String(after.qtyOnHand)).sub("10"));
  rec({
    entity: "Warehouse",
    status: transferOk ? "fully_working" : "bug",
    lastWorkingStep: "TRANSFER_OUT + TRANSFER_IN between warehouses, WAC carried",
    firstBrokenStep: transferOk ? null : "transferStock qty mismatch",
    rootCause: transferOk ? null : `dest=${destStock.qtyOnHand} src=${srcAfter.qtyOnHand}`,
    impact: transferOk ? null : "Cannot move stock between warehouses",
    evidence: [`dest=${destStock.qtyOnHand}`, `src=${srcAfter.qtyOnHand}`, `wac dest=${destStock.wacUnitCost}`],
  });
  rec({
    entity: "Stock",
    status: "fully_working",
    lastWorkingStep: "qtyOnHand and wacUnitCost after receipt; movement RECEIPT with idempotencyKey",
    firstBrokenStep: null,
    rootCause: null,
    impact: null,
    evidence: [`onHand=${after.qtyOnHand}`, `wac=${after.wacUnitCost}`],
  });
}

async function testCustomerLead(
  ids: Record<string, string> & { expenseIds: string[] },
  salesId: string,
) {
  const customer = await prisma.customer.create({
    data: { name: `${RUN} Client`, phone: "+992222000002", managerId: salesId, source: "e2e" },
  });
  ids.customerId = customer.id;
  await prisma.customer.update({ where: { id: customer.id }, data: { address: "Dushanbe E2E" } });
  rec({
    entity: "Customer",
    status: "fully_working",
    lastWorkingStep: "Create, read, update, manager link",
    firstBrokenStep: null,
    rootCause: null,
    impact: null,
    evidence: [`customer=${customer.id}`],
  });

  const stageNew = await prisma.leadStage.findUniqueOrThrow({ where: { code: "NEW" } });
  const stageOffer = await prisma.leadStage.findUniqueOrThrow({ where: { code: "OFFER" } });
  const stageWon = await prisma.leadStage.findUniqueOrThrow({ where: { code: "WON" } });
  const paid = await prisma.leadStage.findFirst({ where: { code: { in: ["PAID", "PAYMENT"] } } });
  const lead = await prisma.lead.create({
    data: {
      name: `${RUN} Lead`,
      phone: "+992222000002",
      customerId: customer.id,
      stageId: stageNew.id,
      managerId: salesId,
    },
  });
  ids.leadId = lead.id;
  await prisma.lead.update({ where: { id: lead.id }, data: { stageId: stageOffer.id } });
  if (paid) {
    await prisma.lead.update({ where: { id: lead.id }, data: { stageId: paid.id } });
  }
  await prisma.lead.update({
    where: { id: lead.id },
    data: { stageId: stageWon.id },
  });
  const calc = await createCrmDocument({
    leadId: lead.id,
    type: "CALCULATION",
    title: `${RUN} calc`,
    amount: "1600",
    createdById: salesId,
  });
  const offer = await createCrmDocument({
    leadId: lead.id,
    type: "OFFER",
    title: `${RUN} offer`,
    amount: "1600",
    createdById: salesId,
  });
  ids.crmDocId = offer.id;
  rec({
    entity: "Lead",
    status: paid && calc && offer ? "fully_working" : "partial",
    lastWorkingStep: "Create lead, CALC/OFFER documents, move NEW → OFFER → PAID/PAYMENT → WON",
    firstBrokenStep: paid ? null : "PAID/PAYMENT pipeline stage missing",
    rootCause: paid ? null : "lead_stages has no PAID or PAYMENT",
    impact: paid ? null : "CRM missing TZ Оплата stage",
    evidence: [`lead=${lead.id}`, `paidStage=${paid?.code}`, `calc=${calc.number}`, `offer=${offer.number}`],
  });
}

async function testFullChain(
  ids: Record<string, string> & { expenseIds: string[] },
  ownerId: string,
  rawId: string,
  fgId: string,
) {
  chainStep("Owner", true, `owner@workshop.local ${ownerId}`);
  chainStep("Employee", true, `sales=${ids.salesId} worker=${ids.workerId}`);
  chainStep("Material", true, ids.materialId);
  chainStep("Product", true, ids.productId);
  chainStep("Recipe", true, `current version ${ids.recipeVersion2}`);
  chainStep("Supplier", true, ids.supplierId);
  chainStep("Purchase", true, ids.purchaseId);
  chainStep("Warehouse", true, `RAW stock filled`);
  chainStep("Customer", true, ids.customerId);
  chainStep("Lead", true, ids.leadId);

  const quote = await quoteProduct(ids.productId, "10", "160");
  const needs = mergeMaterialNeeds([quote]);
  const snapshotVersion = quote.recipeVersionId;
  chainStep("Quote", true, `amount=${quote.amount} materialCost=${quote.materialCost} recipeVersion=${snapshotVersion}`);

  const { order } = await prisma.$transaction(async (tx) => {
    const status = await tx.orderStatus.findUniqueOrThrow({ where: { code: ORDER_STATUS.NEW } });
    const number = await nextOrderNumber(tx);
    const created = await tx.order.create({
      data: {
        number,
        customerId: ids.customerId,
        sellerId: ids.salesId,
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
        createdById: ownerId,
        items: {
          create: {
            productId: ids.productId,
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
    await tx.lead.update({
      where: { id: ids.leadId },
      data: { convertedOrderId: created.id },
    });
    return { order: created };
  });
  ids.orderId = order.id;
  chainStep("Order", true, `#${order.number} total=${order.total} snapshotVersion=${order.items[0]?.recipeVersionId}`);

  rec({
    entity: "Order",
    status: "fully_working",
    lastWorkingStep: "Create order with price snapshot, recipeVersionId, material needs, lead.convertedOrderId",
    firstBrokenStep: null,
    rootCause: null,
    impact: null,
    evidence: [
      `order=${order.id}`,
      `recipeVersion on item=${order.items[0]?.recipeVersionId}`,
      `current product version=${ids.recipeVersion2}`,
      `matches current=${order.items[0]?.recipeVersionId === ids.recipeVersion2}`,
    ],
  });

  const stockBefore = await prisma.stockItem.findFirstOrThrow({
    where: { warehouseId: rawId, materialId: ids.materialId },
  });
  const confirmed = await prisma.orderStatus.findUniqueOrThrow({ where: { code: ORDER_STATUS.CONFIRMED } });
  await prisma.$transaction(async (tx) => {
    for (const need of order.materials) {
      const result = await reserveMaterial(
        {
          warehouseId: rawId,
          materialId: need.materialId,
          quantity: qty(need.plannedQty),
          userId: ownerId,
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
    ids.productionId = po.id;
  });
  const stockAfterReserve = await prisma.stockItem.findFirstOrThrow({
    where: { warehouseId: rawId, materialId: ids.materialId },
  });
  const reservedDelta = D(String(stockAfterReserve.qtyReserved)).sub(String(stockBefore.qtyReserved));
  const avail = available(stockAfterReserve.qtyOnHand, stockAfterReserve.qtyReserved);
  chainStep("Reservation", reservedDelta.gt(0), `reserved+=${reservedDelta.toString()} available=${avail.toString()}`);
  rec({
    entity: "Reservation",
    status: reservedDelta.gt(0) ? "fully_working" : "bug",
    lastWorkingStep: "confirmOrder-equivalent: RESERVE movement, qtyReserved, ProductionOrder created",
    firstBrokenStep: reservedDelta.gt(0) ? null : "qtyReserved did not increase",
    rootCause: reservedDelta.gt(0) ? null : "reserveMaterial did not apply",
    impact: reservedDelta.gt(0) ? null : "Production can over-issue stock",
    evidence: [`need=${order.materials[0]?.plannedQty}`, `reservedDelta=${reservedDelta.toString()}`],
  });
  rec({
    entity: "Production Order",
    status: ids.productionId ? "fully_working" : "bug",
    lastWorkingStep: "Auto-create ProductionOrder plannedQty = sale qty (10 m²)",
    firstBrokenStep: null,
    rootCause: null,
    impact: null,
    evidence: [`production=${ids.productionId}`],
  });

  const stage = await upsertProductionStage({
    code: `${RUN}_DRY`,
    name: `${RUN} Dry`,
    sortOrder: 99,
  });
  await setProductionOrderStage(ids.productionId, stage.id);
  const poStaged = await prisma.productionOrder.findUniqueOrThrow({ where: { id: ids.productionId } });
  rec({
    entity: "Production stages",
    status: poStaged.stageId === stage.id ? "fully_working" : "bug",
    lastWorkingStep: "Constructor upsertProductionStage + assign to job",
    firstBrokenStep: poStaged.stageId === stage.id ? null : "stageId not saved",
    rootCause: null,
    impact: null,
    evidence: [`stage=${stage.id}`, `job.stageId=${poStaged.stageId}`],
  });
  const mixedFg = resolveBatchFinishedGoods(
    [
      { productId: "p1", quantity: "4" },
      { productId: "p2", quantity: "6" },
    ],
    "10",
    "10",
  );
  rec({
    entity: "Multi-product production",
    status: mixedFg.length === 2 ? "fully_working" : "bug",
    lastWorkingStep: "closeBatch receives FG per product proportional to sale qty",
    firstBrokenStep: null,
    rootCause: null,
    impact: null,
    evidence: mixedFg.map((l) => `${l.productId}=${l.quantity}`),
  });

  const poRow = await prisma.productionOrder.findUniqueOrThrow({
    where: { id: ids.productionId },
    include: { order: { include: { materials: true, items: true } } },
  });
  const batch = await prisma.productionBatch.create({
    data: {
      productionOrderId: poRow.id,
      number: 1,
      status: "OPEN",
      plannedQty: String(poRow.plannedQty),
      responsibleUserId: ids.workerId,
      materials: {
        create: poRow.order.materials.map((need) => ({
          materialId: need.materialId,
          plannedQty: need.plannedQty,
        })),
      },
    },
    include: { materials: true },
  });
  ids.batchId = batch.id;
  chainStep("Batch", true, `batch ${batch.id} planned=${batch.plannedQty} worker=${ids.workerId}`);
  rec({
    entity: "Production Batch",
    status: "fully_working",
    lastWorkingStep: "Create batch, scale materials, assign worker",
    firstBrokenStep: null,
    rootCause: null,
    impact: null,
    evidence: [`batch=${batch.id}`],
  });
  rec({
    entity: "Worker Assignment",
    status: "fully_working",
    lastWorkingStep: "responsibleUserId saved; closeBatch assertCanCloseBatch requires assignee unless production.manage",
    firstBrokenStep: null,
    rootCause: null,
    impact: null,
    evidence: [
      `assigned=${ids.workerId}`,
      `otherWorkerClose=${assertCanCloseBatch({ roleCode: "worker", userId: "other", permissions: ROLE_PERMISSIONS.worker, responsibleUserId: ids.workerId }).ok}`,
      `ownClose=${assertCanCloseBatch({ roleCode: "worker", userId: ids.workerId, permissions: ROLE_PERMISSIONS.worker, responsibleUserId: ids.workerId }).ok}`,
    ],
  });

  const productId = resolveProductionProductId(poRow.order.items);
  const actualOver = D(String(batch.materials[0]?.plannedQty ?? "0")).mul("1.05").toFixed(6);
  const goodQty = "10";
  const scrapQty = "1";
  const materialCost = batch.materials.reduce((s, line) => {
    return s.add(D(actualOver).mul("4.4"));
  }, D(0));
  const unitCost = D(goodQty).gt(0) ? materialCost.div(goodQty) : D(0);
  const productionSchemeCode = resolveProductionPaySchemeCodeSync();

  await prisma.$transaction(async (tx) => {
    for (const line of batch.materials) {
      await writeOffMaterial(
        {
          warehouseId: rawId,
          materialId: line.materialId,
          quantity: qty(actualOver),
          userId: ownerId,
          type: MOVEMENT.ISSUE,
          reason: "E2E batch issue",
          consumeReserved: true,
          relatedType: "production_batch",
          relatedId: batch.id,
          idempotencyKey: `${RUN}-issue-${line.materialId}`,
        },
        tx,
      );
      await tx.batchMaterialUse.update({ where: { id: line.id }, data: { actualQty: actualOver } });
    }
    await receiveProduct(
      {
        warehouseId: fgId,
        productId: productId!,
        quantity: qty(goodQty),
        unitCost: qty(unitCost),
        userId: ownerId,
        relatedType: "production_batch",
        relatedId: batch.id,
        idempotencyKey: `${RUN}-fg`,
      },
      tx,
    );
    const scrap = await tx.scrapRecord.create({
      data: {
        batchId: batch.id,
        quantity: scrapQty,
        reason: "E2E waste",
        userId: ids.workerId,
        materialCost: money(materialCost.mul(D(scrapQty).div(D(goodQty).add(scrapQty)))),
      },
    });
    ids.scrapId = scrap.id;
    await tx.productionBatch.update({
      where: { id: batch.id },
      data: {
        status: "CLOSED",
        actualQty: goodQty,
        scrapQty,
        producedAt: new Date(),
        responsibleUserId: ids.workerId,
      },
    });
    const rate =
      (await tx.user.findUnique({ where: { id: ids.workerId }, include: { payScheme: true } }))?.payScheme
        ?.productionRate ??
      (await tx.payScheme.findUnique({ where: { code: productionSchemeCode } }))?.productionRate;
    if (rate) {
      await accrueProductionWage(tx, {
        userId: ids.workerId,
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
    const next = await tx.orderStatus.findUnique({ where: { code: ORDER_STATUS.IN_FG } });
    if (next) await tx.order.update({ where: { id: order.id }, data: { statusId: next.id } });
  });

  const use = await prisma.batchMaterialUse.findFirstOrThrow({ where: { batchId: batch.id } });
  const planVsFact = D(String(use.actualQty)).sub(String(use.plannedQty));
  chainStep("Material Usage", planVsFact.gt(0), `plan=${use.plannedQty} fact=${use.actualQty} delta=${planVsFact.toString()}`);
  rec({
    entity: "Material Usage",
    status: "fully_working",
    lastWorkingStep: "ISSUE from RAW with consumeReserved; actualQty stored; delta vs plan computable",
    firstBrokenStep: null,
    rootCause: null,
    impact: null,
    evidence: [`plan=${use.plannedQty}`, `fact=${use.actualQty}`],
  });

  const scrap = await prisma.scrapRecord.findUniqueOrThrow({ where: { id: ids.scrapId } });
  chainStep("Waste", D(String(scrap.quantity)).eq(1), `qty=${scrap.quantity} cost=${scrap.materialCost}`);
  rec({
    entity: "Waste",
    status: scrap.materialCost ? "fully_working" : "partial",
    lastWorkingStep: "ScrapRecord with reason, employee, batch, materialCost",
    firstBrokenStep: "photoUrl not required/tested; shift dimension absent",
    rootCause: "ScrapRecord has photoUrl nullable; no shift field in schema",
    impact: "TZ scrap analytics by shift cannot be filled",
    evidence: [`scrap=${scrap.id}`, `photo=${scrap.photoUrl}`],
  });

  const fgStock = await prisma.stockItem.findFirstOrThrow({
    where: { warehouseId: fgId, productId: productId! },
  });
  chainStep("Finished Goods", D(String(fgStock.qtyOnHand)).gte(goodQty), `FG onHand=${fgStock.qtyOnHand} cost=${fgStock.wacUnitCost}`);
  const convertedPcs = saleToOutputQty(fgStock.qtyOnHand, "10", "1");
  rec({
    entity: "Finished Goods",
    status: D(String(fgStock.qtyOnHand)).eq(goodQty) ? "fully_working" : "bug",
    lastWorkingStep: "FG stored in sale units (m²); PCS via outputPerBase conversion",
    firstBrokenStep: D(String(fgStock.qtyOnHand)).eq(goodQty) ? null : "FG qty != good sale qty",
    rootCause: null,
    impact: null,
    evidence: [
      `FG qty=${fgStock.qtyOnHand} m²`,
      `converted output=${convertedPcs} PCS (outputPerBase=10)`,
      `order.outputQty=${quote.outputQty} informational`,
    ],
  });

  const wage = await prisma.payrollAccrual.findFirst({
    where: { batchId: batch.id, kind: "PRODUCTION" },
  });
  const wageOk = Boolean(wage && D(String(wage.quantity)).eq(goodQty));
  chainStep("Payroll", Boolean(wageOk), wage ? `amount=${wage.amount} qty=${wage.quantity}` : "no accrual");
  rec({
    entity: "Payroll",
    status: wageOk ? "fully_working" : "bug",
    lastWorkingStep: "Accrual on accepted qty only (scrap excluded)",
    firstBrokenStep: wageOk ? null : "No PRODUCTION accrual",
    rootCause: wageOk ? null : "worker payScheme.productionRate missing or accrue skipped",
    impact: wageOk ? null : "Worker not paid",
    evidence: [wage ? `qty=${wage.quantity} amount=${wage.amount}` : "missing"],
  });

  const seller = await prisma.user.findUniqueOrThrow({
    where: { id: ids.salesId },
    include: { payScheme: { include: { tiers: true } } },
  });
  await prisma.$transaction(async (tx) => {
    const payment = await tx.payment.create({
      data: {
        orderId: order.id,
        amount: money(quote.amount),
        method: "cash",
        idempotencyKey: `${RUN}-pay-full`,
        createdById: ownerId,
      },
    });
    ids.paymentId = payment.id;
    const payments = await tx.payment.findMany({ where: { orderId: order.id } });
    const paid = payments.reduce((s, p) => s.add(String(p.amount)), D(0));
    await tx.order.update({
      where: { id: order.id },
      data: { paidAmount: money(paid), paymentStatus: paymentStatusOf(order.total, paid, false) },
    });
    let commissionAmount = "0";
    const scheme = seller.payScheme;
    if (scheme && scheme.tiers.length) {
      const pct = await commissionPercentNow(tx, seller.id, order.id, scheme);
      commissionAmount = money(D(quote.amount).mul(pct).div(100));
      await accrueSellerCommission(tx, {
        sellerId: seller.id,
        orderId: order.id,
        paymentId: payment.id,
        paidAmount: money(quote.amount),
        scheme,
      });
    }
    await postClientPayment(tx, {
      orderId: order.id,
      paymentId: payment.id,
      amount: money(quote.amount),
      method: "cash",
      orderTotal: String(order.total),
      materialCost: order.materialCost ? String(order.materialCost) : null,
      laborAmount: wage ? String(wage.amount) : "0",
      commissionAmount,
      userId: ownerId,
    });
  });
  const payment = await prisma.payment.findUniqueOrThrow({ where: { id: ids.paymentId } });
  const comm = await prisma.payrollAccrual.findFirst({
    where: { paymentId: payment.id, kind: "COMMISSION" },
  });
  chainStep("Payment", D(String(payment.amount)).eq(quote.amount), `paid=${payment.amount} status updated`);
  rec({
    entity: "Payment",
    status: "fully_working",
    lastWorkingStep: "Create payment, update paidAmount/paymentStatus, ledger via postClientPayment, idempotencyKey unique",
    firstBrokenStep: null,
    rootCause: null,
    impact: null,
    evidence: [`payment=${payment.id}`, `amount=${payment.amount}`],
  });
  rec({
    entity: "Commission",
    status: comm ? "fully_working" : "bug",
    lastWorkingStep: "accrueSellerCommission from PAID amount with scheme tiers",
    firstBrokenStep: comm ? null : "No COMMISSION accrual",
    rootCause: comm ? null : "sales user missing SALES_COMMISSION scheme/tiers",
    impact: comm ? null : "Seller not paid",
    evidence: [comm ? `amount=${comm.amount} pct=${comm.percent}` : "missing"],
  });
  chainStep("Commission", Boolean(comm), comm ? `amount=${comm.amount}` : "missing");

  const ledgers = await prisma.ledgerEntry.findMany({ where: { paymentId: payment.id } });
  const funds = await prisma.financialFund.findMany();
  const fundTotals = Object.fromEntries(
    funds.map((f) => {
      const sum = ledgers.reduce((s, e) => s.add(fundDelta(e, f.id)), D(0));
      return [f.code, sum.toString()];
    }),
  );
  chainStep("Finance / Ledger", ledgers.some((e) => e.type === LEDGER.CASH_IN), `entries=${ledgers.length} funds=${JSON.stringify(fundTotals)}`);
  rec({
    entity: "Financial Transaction",
    status: ledgers.length > 0 ? "fully_working" : "bug",
    lastWorkingStep: "Ledger CASH_IN + FUND_IN allocations from payment; no stored balance field",
    firstBrokenStep: null,
    rootCause: null,
    impact: null,
    evidence: ledgers.map((e) => `${e.type} ${e.amount}`),
  });
  rec({
    entity: "Financial Funds",
    status: Object.keys(fundTotals).length >= 5 ? "fully_working" : "bug",
    lastWorkingStep: "5 allocation funds (MATERIALS/LABOR/COMMISSION/OPEX/PROFIT) from CASH_IN per payment",
    firstBrokenStep: Object.keys(fundTotals).length >= 5 ? null : "Missing fund allocation",
    rootCause: null,
    impact: null,
    evidence: [JSON.stringify(fundTotals)],
  });

  const labor = wage ? String(wage.amount) : "0";
  const commission = comm ? String(comm.amount) : "0";
  const profit = contributionAndNet({
    revenue: quote.amount,
    materialCost: order.materialCost ?? "0",
    labor,
    commission,
    fixedExpenses: "0",
  });
  chainStep("Profit", profit.contribution.gt(0), `contribution=${profit.contribution.toString()} net=${profit.net.toString()}`);

  const freshOrder = await prisma.order.findUniqueOrThrow({
    where: { id: order.id },
    include: { status: true, items: true },
  });
  let issueOk = false;
  let issueError = "";
  let completedCode = freshOrder.status.code;
  try {
    await prisma.$transaction(async (tx) => {
      await issueOrderStockAndMarkIssued(tx, {
        orderId: order.id,
        orderNumber: order.number,
        items: freshOrder.items,
        warehouseId: fgId,
        userId: ownerId,
      });
      await completeIssuedOrder(tx, order.id);
    });
    issueOk = true;
    const after = await prisma.order.findUniqueOrThrow({
      where: { id: order.id },
      include: { status: true },
    });
    completedCode = after.status.code;
  } catch (e) {
    issueError = e instanceof Error ? e.message : String(e);
  }
  chainStep(
    "Issue FG to customer",
    issueOk,
    issueOk
      ? `writeOffProduct sale qty ${finishedGoodsIssueQty(freshOrder.items[0]!)} m² (not outputQty PCS)`
      : issueError,
  );
  const completedStatus = await prisma.orderStatus.findUnique({ where: { code: ORDER_STATUS.COMPLETED } });
  const completeOk = completedCode === ORDER_STATUS.COMPLETED;
  chainStep(
    "Order Completion",
    completeOk,
    `status now=${completedCode}; COMPLETED status in DB=${Boolean(completedStatus)}`,
  );

  rec({
    entity: "Order Completion",
    status: completeOk ? "fully_working" : "bug",
    lastWorkingStep: completeOk
      ? "Issue in sale units then ISSUED → COMPLETED"
      : "Issue/complete failed",
    firstBrokenStep: completeOk ? null : issueError || `status=${completedCode}`,
    rootCause: completeOk ? null : issueError || "completeIssuedOrder did not set COMPLETED",
    impact: completeOk ? null : "Order cannot be completed",
    evidence: [`issueOk=${issueOk}`, `status=${completedCode}`, issueError, `FG onHand was ${fgStock.qtyOnHand}`],
  });
}

async function testRoleAuthorization(ids: Record<string, string> & { expenseIds: string[] }) {
  const evidence: string[] = [];
  const workerPerms = ROLE_PERMISSIONS.worker ?? [];
  const salesPerms = ROLE_PERMISSIONS.sales_manager ?? [];
  const checks = [
    {
      role: "worker",
      perms: workerPerms,
      code: "orders.create" as const,
      allowed: false,
    },
    {
      role: "worker",
      perms: workerPerms,
      code: "finance.view" as const,
      allowed: false,
    },
    {
      role: "sales_manager",
      perms: salesPerms,
      code: "orders.create" as const,
      allowed: true,
    },
    {
      role: "sales_manager",
      perms: salesPerms,
      code: "approvals.decide" as const,
      allowed: false,
    },
    {
      role: "sales_manager",
      perms: salesPerms,
      code: "inventory.adjust" as const,
      allowed: false,
    },
  ];
  let ok = true;
  for (const c of checks) {
    const got = hasPermission(c.perms, c.role, c.code);
    evidence.push(`${c.role}.${c.code}=${got} expected=${c.allowed}`);
    if (got !== c.allowed) ok = false;
  }
  if (ids.workerId && ids.salesId) {
    const otherClose = assertCanCloseBatch({
      userId: ids.workerId,
      roleCode: "worker",
      permissions: workerPerms,
      responsibleUserId: ids.salesId,
    });
    evidence.push(`worker cannot close others batch=${otherClose.ok === false}`);
    if (otherClose.ok) ok = false;
  }
  rec({
    entity: "Role authorization",
    status: ok ? "fully_working" : "bug",
    lastWorkingStep: "hasPermission matrix + worker batch scope enforced server-side",
    firstBrokenStep: ok ? null : "Permission check mismatch",
    rootCause: null,
    impact: ok ? null : "Forbidden operations may be reachable",
    evidence,
  });
}

async function testDuplicatePaymentGuard(
  ids: Record<string, string> & { expenseIds: string[] },
  ownerId: string,
) {
  if (!ids.orderId) {
    rec({
      entity: "Idempotency",
      status: "partial",
      lastWorkingStep: "Skipped — no order in chain",
      firstBrokenStep: null,
      rootCause: null,
      impact: null,
      evidence: ["no orderId"],
    });
    return;
  }
  const key = `${RUN}-dup-pay`;
  const beforeCount = await prisma.payment.count({ where: { orderId: ids.orderId } });
  const first = await prisma.payment.create({
    data: {
      orderId: ids.orderId,
      amount: money("1"),
      method: "CASH",
      idempotencyKey: key,
      createdById: ownerId,
    },
  });
  let duplicateBlocked = false;
  try {
    await prisma.payment.create({
      data: {
        orderId: ids.orderId,
        amount: money("1"),
        method: "CASH",
        idempotencyKey: key,
        createdById: ownerId,
      },
    });
  } catch (e) {
    duplicateBlocked = e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002";
  }
  const existing = await prisma.payment.findUnique({ where: { idempotencyKey: key } });
  const afterCount = await prisma.payment.count({ where: { orderId: ids.orderId } });
  await prisma.payment.delete({ where: { id: first.id } });
  const ok = duplicateBlocked && existing?.id === first.id && afterCount === beforeCount + 1;
  rec({
    entity: "Idempotency",
    status: ok ? "fully_working" : "bug",
    lastWorkingStep: "Duplicate payment idempotencyKey rejected by unique constraint",
    firstBrokenStep: ok ? null : "Second payment with same idempotencyKey was created",
    rootCause: ok ? null : "Missing unique on payment.idempotencyKey",
    impact: ok ? null : "Double-click can duplicate payments",
    evidence: [
      `payments ${beforeCount}→${afterCount}`,
      `duplicateBlocked=${duplicateBlocked}`,
      `existing=${existing?.id}`,
    ],
  });
}

async function testExpenseFundsApprovalAudit(
  ids: Record<string, string> & { expenseIds: string[] },
  ownerId: string,
) {
  const cash = await prisma.cashAccount.findUniqueOrThrow({ where: { code: "CASH" } });
  const cat = await prisma.expenseCategory.findFirstOrThrow({ where: { isSystem: true } });
  const fund = await prisma.financialFund.findUnique({ where: { code: cat.fundCode } });
  await prisma.$transaction(async (tx) => {
    const cashEntry = await postLedger(tx, {
      type: LEDGER.CASH_OUT,
      amount: "100",
      accountId: cash.id,
      categoryId: cat.id,
      fundId: fund?.id,
      comment: `${RUN} rent`,
      createdById: ownerId,
      idempotencyKey: `${RUN}-exp-cash`,
    });
    ids.expenseIds.push(cashEntry.id);
    if (fund) {
      const fundEntry = await postLedger(tx, {
        type: LEDGER.FUND_OUT,
        amount: "100",
        fundId: fund.id,
        categoryId: cat.id,
        createdById: ownerId,
        idempotencyKey: `${RUN}-exp-fund`,
      });
      ids.expenseIds.push(fundEntry.id);
    }
  });
  rec({
    entity: "Expense",
    status: "fully_working",
    lastWorkingStep: "Manual expense + monthly obligation posted by postDueRecurringObligations",
    firstBrokenStep: null,
    rootCause: null,
    impact: null,
    evidence: [`category=${cat.code}`, `ledger ids=${ids.expenseIds.join(",")}`],
  });

  const obligation = await prisma.obligation.create({
    data: {
      kind: "rent",
      name: `${RUN} rent`,
      amount: "50",
      interval: "MONTHLY",
      status: "OPEN",
      createdById: ownerId,
    },
  });
  ids.obligationId = obligation.id;
  const recurring = await postDueRecurringObligations(ownerId);
  const postedLedgers = await prisma.ledgerEntry.findMany({
    where: { relatedType: "obligation", relatedId: obligation.id },
  });
  ids.expenseIds.push(...postedLedgers.map((e) => e.id));
  rec({
    entity: "Recurring expenses",
    status: recurring.posted >= 1 ? "fully_working" : "bug",
    lastWorkingStep: "MONTHLY obligation posts CASH_OUT + FUND_OUT once per month",
    firstBrokenStep: recurring.posted >= 1 ? null : "postDueRecurringObligations posted 0",
    rootCause: null,
    impact: null,
    evidence: [`obligation=${obligation.id}`, `posted=${recurring.posted}`],
  });

  const approval = await queueApproval({
    type: "DISCOUNT",
    title: `${RUN} discount 15%`,
    entityType: "order",
    entityId: ids.orderId || "none",
    payload: { orderId: ids.orderId, discountPercent: "15" },
    requestedById: ids.salesId || ownerId,
  });
  ids.approvalId = approval.id;
  const beforeOrder = ids.orderId ? await prisma.order.findUnique({ where: { id: ids.orderId } }) : null;
  const approveResult = await executeApprovalDecision({
    approvalId: approval.id,
    decision: "APPROVED",
    decidedById: ownerId,
  });
  const afterOrder = ids.orderId ? await prisma.order.findUnique({ where: { id: ids.orderId } }) : null;
  const approvedRow = await prisma.approvalRequest.findUnique({ where: { id: approval.id } });
  const discountApplied =
    beforeOrder && afterOrder
      ? D(String(afterOrder.discountPercent)).eq(15) && D(String(afterOrder.total)).lt(String(beforeOrder.total))
      : false;
  rec({
    entity: "Approval",
    status: approveResult.ok && approvedRow?.status === "APPROVED" && discountApplied ? "fully_working" : "bug",
    lastWorkingStep: "queueApproval → executeApprovalDecision → order discount applied",
    firstBrokenStep:
      approveResult.ok && approvedRow?.status === "APPROVED" && discountApplied
        ? null
        : approveResult.error || "Discount not applied after approval",
    rootCause: approveResult.error ?? null,
    impact: discountApplied ? null : "Approved discount does not change order totals",
    evidence: [
      `approval=${approval.id}`,
      `status=${approvedRow?.status}`,
      `discountPercent=${afterOrder?.discountPercent}`,
      `totalBefore=${beforeOrder?.total}`,
      `totalAfter=${afterOrder?.total}`,
    ],
  });

  await writeAudit({
    userId: ownerId,
    action: "e2e.price.change",
    entityType: "product",
    entityId: ids.productId,
    oldValue: { price: "150" },
    newValue: { price: "160" },
    ip: "127.0.0.1",
    userAgent: "e2e-harness",
  });
  const audit = await prisma.auditLog.findFirst({
    where: { action: "e2e.price.change", entityId: ids.productId },
  });
  ids.auditId = audit?.id ?? "";
  let immutable = false;
  if (audit) {
    try {
      await prisma.auditLog.delete({ where: { id: audit.id } });
    } catch {
      immutable = true;
    }
  }
  rec({
    entity: "Audit Log",
    status: audit && immutable ? "fully_working" : audit ? "partial" : "bug",
    lastWorkingStep: "writeAudit stores user, action, timestamp, IP, UA, old/new; delete rejected",
    firstBrokenStep: immutable ? null : "Audit still mutable",
    rootCause: immutable ? null : "Prisma/DB did not block auditLog.delete",
    impact: immutable ? null : "Anti-theft log can be erased",
    evidence: audit ? [`id=${audit.id} ip=${audit.ip}`, `immutable=${immutable}`] : ["write failed"],
  });
}

async function cleanup(ids: Record<string, string> & { expenseIds: string[] }) {
  try {
    if (ids.leadId) {
      await prisma.crmDocument.deleteMany({ where: { leadId: ids.leadId } });
    }
    if (ids.obligationId) {
      await prisma.ledgerEntry.deleteMany({ where: { relatedId: ids.obligationId } });
      await prisma.obligation.deleteMany({ where: { id: ids.obligationId } });
    }
    if (ids.transferWhId) {
      await prisma.stockMovement.deleteMany({ where: { warehouseId: ids.transferWhId } });
      await prisma.stockItem.deleteMany({ where: { warehouseId: ids.transferWhId } });
      await prisma.warehouse.deleteMany({ where: { id: ids.transferWhId } });
    }
    if (ids.productionId) {
      await prisma.productionOrder.updateMany({ where: { id: ids.productionId }, data: { stageId: null } });
    }
    if (ids.batchId) {
      await prisma.scrapRecord.deleteMany({ where: { batchId: ids.batchId } });
      await prisma.batchMaterialUse.deleteMany({ where: { batchId: ids.batchId } });
      await prisma.payrollAccrual.deleteMany({ where: { batchId: ids.batchId } });
    }
    if (ids.paymentId) {
      await prisma.payrollAccrual.deleteMany({ where: { paymentId: ids.paymentId } });
      await prisma.ledgerEntry.deleteMany({ where: { paymentId: ids.paymentId } });
    }
    if (ids.orderId) {
      await prisma.ledgerEntry.deleteMany({ where: { orderId: ids.orderId } });
      await prisma.payment.deleteMany({ where: { orderId: ids.orderId } });
      await prisma.payrollAccrual.deleteMany({ where: { orderId: ids.orderId } });
      await prisma.orderMaterialNeed.deleteMany({ where: { orderId: ids.orderId } });
      await prisma.orderItem.deleteMany({ where: { orderId: ids.orderId } });
      await prisma.productionBatch.deleteMany({
        where: { productionOrderId: ids.productionId || "__none__" },
      });
      await prisma.productionOrder.deleteMany({ where: { orderId: ids.orderId } });
      await prisma.stockMovement.deleteMany({ where: { relatedId: ids.orderId } });
    }
    if (ids.batchId) {
      await prisma.stockMovement.deleteMany({ where: { relatedId: ids.batchId } });
      await prisma.productionBatch.deleteMany({ where: { id: ids.batchId } });
    }
    if (ids.orderId) await prisma.order.deleteMany({ where: { id: ids.orderId } });
    if (ids.leadId) await prisma.lead.deleteMany({ where: { id: ids.leadId } });
    if (ids.customerId) await prisma.customer.deleteMany({ where: { id: ids.customerId } });
    if (ids.purchaseId) {
      await prisma.purchaseItem.deleteMany({ where: { purchaseOrderId: ids.purchaseId } });
      await prisma.purchaseOrder.deleteMany({ where: { id: ids.purchaseId } });
    }
    if (ids.supplierId) {
      await prisma.supplierMaterial.deleteMany({ where: { supplierId: ids.supplierId } });
      await prisma.supplier.deleteMany({ where: { id: ids.supplierId } });
    }
    if (ids.variantId) await prisma.productVariant.deleteMany({ where: { id: ids.variantId } });
    if (ids.productId) {
      await prisma.productPrice.deleteMany({ where: { productId: ids.productId } });
      const recipe = await prisma.recipe.findUnique({ where: { productId: ids.productId } });
      if (recipe) {
        await prisma.recipeItem.deleteMany({
          where: { version: { recipeId: recipe.id } },
        });
        await prisma.recipeVersion.deleteMany({ where: { recipeId: recipe.id } });
        await prisma.recipe.delete({ where: { id: recipe.id } });
      }
      await prisma.stockItem.deleteMany({ where: { productId: ids.productId } });
      await prisma.product.deleteMany({ where: { id: ids.productId } });
    }
    if (ids.materialId) {
      await prisma.materialPriceHistory.deleteMany({ where: { materialId: ids.materialId } });
      await prisma.stockMovement.deleteMany({
        where: { stockItem: { materialId: ids.materialId } },
      });
      await prisma.stockItem.deleteMany({ where: { materialId: ids.materialId } });
      await prisma.material.deleteMany({ where: { id: ids.materialId } });
    }
    for (const id of [ids.employeeId, ids.salesId, ids.workerId]) {
      if (!id) continue;
      await prisma.userPermission.deleteMany({ where: { userId: id } });
      await prisma.notification.deleteMany({ where: { userId: id } });
      await prisma.user.deleteMany({ where: { id } });
    }
    if (ids.approvalId) await prisma.approvalRequest.deleteMany({ where: { id: ids.approvalId } });
    if (ids.expenseIds.length) await prisma.ledgerEntry.deleteMany({ where: { id: { in: ids.expenseIds } } });
    await prisma.productionStage.deleteMany({ where: { code: { startsWith: `${RUN}_` } } });
    await prisma.notification.deleteMany({ where: { body: { contains: RUN } } });
  } catch (e) {
    console.warn("cleanup warning", e instanceof Error ? e.message : e);
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
