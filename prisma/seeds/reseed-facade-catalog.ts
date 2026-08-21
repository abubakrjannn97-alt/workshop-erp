/**
 * Wipe products/materials/recipes/stock and seed facade catalog + FG opening.
 * Used by CLI script and one-shot production admin API.
 */
import type { PrismaClient } from "@prisma/client";
import { seedFacadeDomain } from "../../prisma/seeds/domains/facade";
import { FACADE_DOMAIN_CONFIG } from "../../src/domains/facade/config";
import { FACADE_PRODUCTS } from "../../src/domains/facade/catalog";
import { receiveProduct } from "../../src/core/inventory/stock";

const FG_OPENING: Record<string, string> = {
  "Фасадная плитка «Сланец» серый": "80",
  "Фасадная плитка «Кирпич» терракота": "60",
  "Фасадная плитка «Травертин» бежевый": "50",
  "Декоративный камень «Скала»": "40",
  "Цоколь «Дикий камень»": "35",
};

async function safeDelete(prisma: PrismaClient, label: string, fn: () => Promise<unknown>) {
  try {
    await fn();
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    if (msg.includes("does not exist") || msg.includes("P2021")) return;
    throw e;
  }
}

export async function wipeFacadeCatalogDependents(prisma: PrismaClient) {
  await safeDelete(prisma, "scrap", () => prisma.scrapRecord.deleteMany({}));
  await safeDelete(prisma, "batchUses", () => prisma.batchMaterialUse.deleteMany({}));
  await safeDelete(prisma, "payrollAccrual", () => prisma.payrollAccrual.deleteMany({}));
  await safeDelete(prisma, "batches", () => prisma.productionBatch.deleteMany({}));
  await safeDelete(prisma, "prodOrders", () => prisma.productionOrder.deleteMany({}));
  await safeDelete(prisma, "payments", () => prisma.payment.deleteMany({}));
  await safeDelete(prisma, "orderNeeds", () => prisma.orderMaterialNeed.deleteMany({}));
  await safeDelete(prisma, "orderItems", () => prisma.orderItem.deleteMany({}));
  await safeDelete(prisma, "orders", () => prisma.order.deleteMany({}));
  await safeDelete(prisma, "stockMoves", () => prisma.stockMovement.deleteMany({}));
  await safeDelete(prisma, "stockItems", () => prisma.stockItem.deleteMany({}));
  await safeDelete(prisma, "purchasePayments", () => prisma.purchasePayment.deleteMany({}));
  await safeDelete(prisma, "purchaseItems", () => prisma.purchaseItem.deleteMany({}));
  await safeDelete(prisma, "purchases", () => prisma.purchaseOrder.deleteMany({}));
  await safeDelete(prisma, "supplierMats", () => prisma.supplierMaterial.deleteMany({}));
  await safeDelete(prisma, "notifications", () => prisma.notification.deleteMany({}));
  await safeDelete(prisma, "approvals", () => prisma.approvalRequest.deleteMany({}));
  await safeDelete(prisma, "recipeItems", () => prisma.recipeItem.deleteMany({}));
  await safeDelete(prisma, "recipeVersions", () => prisma.recipeVersion.deleteMany({}));
  await safeDelete(prisma, "recipes", () => prisma.recipe.deleteMany({}));
  await safeDelete(prisma, "productPrices", () => prisma.productPrice.deleteMany({}));
  await safeDelete(prisma, "variants", () => prisma.productVariant.deleteMany({}));
  await safeDelete(prisma, "products", () => prisma.product.deleteMany({}));
  await safeDelete(prisma, "matPrices", () => prisma.materialPriceHistory.deleteMany({}));
  await safeDelete(prisma, "materials", () => prisma.material.deleteMany({}));
}

async function ensurePeriodOpen(prisma: PrismaClient) {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth() + 1;
  await prisma.accountingPeriod.upsert({
    where: { year_month: { year, month } },
    create: { year, month, status: "OPEN" },
    update: { status: "OPEN", closedAt: null, closedById: null },
  });
}

async function seedFgOpening(prisma: PrismaClient) {
  const fg = await prisma.warehouse.findUnique({
    where: { code: FACADE_DOMAIN_CONFIG.warehouses.fgCode },
  });
  const owner = await prisma.user.findFirst({
    where: { email: process.env.OWNER_EMAIL ?? "owner@workshop.local" },
  });
  if (!fg || !owner) return;

  for (const [name, quantity] of Object.entries(FG_OPENING)) {
    const product = await prisma.product.findFirst({ where: { name } });
    if (!product) continue;
    await receiveProduct({
      warehouseId: fg.id,
      productId: product.id,
      quantity,
      unitCost: product.minPrice?.toString() ?? "0",
      userId: owner.id,
      comment: "Начальный остаток ГП (reseed)",
      idempotencyKey: `reseed-fg-${product.id}`,
    });
  }
}

export async function reseedFacadeCatalog(prisma: PrismaClient) {
  process.env.REPLACE_CATALOG = "1";
  if (process.env.SEED_DEMO === undefined) process.env.SEED_DEMO = "1";

  await ensurePeriodOpen(prisma);
  await wipeFacadeCatalogDependents(prisma);
  await seedFacadeDomain(prisma);
  await seedFgOpening(prisma);

  const products = await prisma.product.findMany({
    select: { name: true, photoUrl: true, minPrice: true },
    orderBy: { name: "asc" },
  });
  const materials = await prisma.material.count();
  const expected = new Set(FACADE_PRODUCTS.map((p) => p.name));
  return {
    products,
    materials,
    unexpected: products.filter((p) => !expected.has(p.name)).map((p) => p.name),
  };
}
