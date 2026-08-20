import type { PrismaClient } from "@prisma/client";
import Decimal from "decimal.js";
import { persistDomainSettings } from "../persist-domain-settings";
import { FACADE_DOMAIN_CONFIG } from "../../../src/domains/facade/config";
import { receiveMaterial } from "../../../src/core/inventory/stock";

const D = (v: string) => new Decimal(v);

export type FacadeDomainSeedResult = {
  productionSchemeId: string;
};

/** Facade domain catalog, payroll scheme, domain settings, opening stock. */
export async function seedFacadeDomain(prisma: PrismaClient): Promise<FacadeDomainSeedResult> {
  await persistDomainSettings(prisma, FACADE_DOMAIN_CONFIG);

  const prodScheme = await prisma.payScheme.upsert({
    where: { code: FACADE_DOMAIN_CONFIG.payroll.productionScheme },
    update: { name: "Производство, с/м²", kind: "PRODUCTION_M2", productionRate: "22" },
    create: {
      code: FACADE_DOMAIN_CONFIG.payroll.productionScheme,
      name: "Производство, с/м²",
      kind: "PRODUCTION_M2",
      productionRate: "22",
    },
  });

  await seedFacadeCatalog(prisma);
  await seedFacadeOpeningStock(prisma);

  return { productionSchemeId: prodScheme.id };
}

async function seedFacadeCatalog(prisma: PrismaClient) {
  const kg = await prisma.unit.findUniqueOrThrow({ where: { code: "KG" } });
  const g = await prisma.unit.findUniqueOrThrow({ where: { code: "G" } });
  const m2 = await prisma.unit.findUniqueOrThrow({ where: { code: "M2" } });
  const pcs = await prisma.unit.findUniqueOrThrow({ where: { code: "PCS" } });
  const bucket = await prisma.unit.findUniqueOrThrow({ where: { code: "BUCKET" } });

  async function material(data: {
    name: string;
    category: string;
    packageWeight: string;
    packagePrice: string;
    minStock: string;
  }) {
    const existing = await prisma.material.findFirst({ where: { name: data.name } });
    if (existing) return existing;
    const created = await prisma.material.create({
      data: {
        name: data.name,
        category: data.category,
        storageUnitId: kg.id,
        purchaseUnitId: kg.id,
        packageWeight: data.packageWeight,
        packagePrice: data.packagePrice,
        minStock: data.minStock,
        lastPurchasePrice: data.packagePrice === "0" ? null : undefined,
      },
    });
    if (data.packagePrice !== "0") {
      const unitPrice = new Decimal(data.packagePrice).div(data.packageWeight).toFixed(6);
      await prisma.materialPriceHistory.create({
        data: {
          materialId: created.id,
          packageWeight: data.packageWeight,
          packagePrice: data.packagePrice,
          unitPrice,
        },
      });
      await prisma.material.update({
        where: { id: created.id },
        data: {
          lastPurchasePrice: unitPrice,
          averagePurchasePrice: unitPrice,
        },
      });
    }
    return created;
  }

  const white = await material({
    name: "Белый цемент",
    category: "Цемент",
    packageWeight: "50",
    packagePrice: "200",
    minStock: "200",
  });
  await material({
    name: "Обычный цемент",
    category: "Цемент",
    packageWeight: "50",
    packagePrice: "65",
    minStock: "200",
  });
  const paint = await material({
    name: "Краска",
    category: "Краска",
    packageWeight: "25",
    packagePrice: "600",
    minStock: "20",
  });
  const glue = await material({
    name: "Клей",
    category: "Клей",
    packageWeight: "25",
    packagePrice: "500",
    minStock: "15",
  });
  const sand = await prisma.material.findFirst({ where: { name: "Песок" } });
  const sandPrice = "15";
  const sandRow =
    sand ??
    (await prisma.material.create({
      data: {
        name: "Песок",
        category: "Заполнитель",
        storageUnitId: kg.id,
        purchaseUnitId: bucket.id,
        packageWeight: "1",
        packagePrice: sandPrice,
        minStock: "0",
      },
    }));
  if (sandRow && D(String(sandRow.packagePrice)).lte(0)) {
    const unitPrice = new Decimal(sandPrice).div(sandRow.packageWeight).toFixed(6);
    await prisma.material.update({
      where: { id: sandRow.id },
      data: {
        packagePrice: sandPrice,
        lastPurchasePrice: unitPrice,
        averagePurchasePrice: unitPrice,
      },
    });
    await prisma.materialPriceHistory.create({
      data: {
        materialId: sandRow.id,
        packageWeight: sandRow.packageWeight,
        packagePrice: sandPrice,
        unitPrice,
      },
    });
  }

  async function ensureProductPrice(productId: string, price: string) {
    const current = await prisma.productPrice.findFirst({
      where: { productId, validTo: null },
      orderBy: { validFrom: "desc" },
    });
    if (current && D(String(current.price)).eq(price)) return;
    if (current) {
      await prisma.productPrice.update({ where: { id: current.id }, data: { validTo: new Date() } });
    }
    await prisma.productPrice.create({ data: { productId, price } });
  }

  const { defaultCategory, defaultOutputPerBase } = FACADE_DOMAIN_CONFIG.product;

  let tile = await prisma.product.findFirst({ where: { name: "Фасадная плитка" } });
  if (!tile) {
    tile = await prisma.product.create({
      data: {
        name: "Фасадная плитка",
        category: defaultCategory,
        saleUnitId: m2.id,
        outputUnitId: pcs.id,
        recipeBaseQty: "1",
        outputPerBase: String(defaultOutputPerBase),
        minPrice: "120",
        recipe: { create: {} },
      },
    });
    await prisma.productPrice.create({
      data: { productId: tile.id, price: "150" },
    });
    const recipe = await prisma.recipe.findUniqueOrThrow({ where: { productId: tile.id } });
    await prisma.recipeVersion.create({
      data: {
        recipeId: recipe.id,
        versionNumber: 1,
        comment: "Стартовая норма: 1 м² / 10 плиток",
        items: {
          create: [
            { materialId: white.id, quantity: "7", unitId: kg.id },
            { materialId: paint.id, quantity: "400", unitId: g.id },
            { materialId: glue.id, quantity: "60", unitId: g.id },
            { materialId: sandRow.id, quantity: "1", unitId: bucket.id },
          ],
        },
      },
    });
  } else {
    await ensureProductPrice(tile.id, "150");
    await prisma.product.update({
      where: { id: tile.id },
      data: { minPrice: "120" },
    });
  }

  const stone = await prisma.product.findFirst({ where: { name: "Декоративный камень" } });
  if (!stone) {
    const created = await prisma.product.create({
      data: {
        name: "Декоративный камень",
        category: defaultCategory,
        saleUnitId: m2.id,
        outputUnitId: pcs.id,
        recipeBaseQty: "1",
        outputPerBase: "1",
        recipe: { create: {} },
      },
    });
    await prisma.productPrice.create({ data: { productId: created.id, price: "180" } });
  } else {
    await ensureProductPrice(stone.id, "180");
  }
}

async function seedFacadeOpeningStock(prisma: PrismaClient) {
  const raw = await prisma.warehouse.findUnique({
    where: { code: FACADE_DOMAIN_CONFIG.warehouses.rawCode },
  });
  const owner = await prisma.user.findFirst({
    where: { email: process.env.OWNER_EMAIL ?? "owner@workshop.local" },
  });
  if (!raw || !owner) return;

  const amounts: Record<string, string> = {
    "Белый цемент": "2000",
    Краска: "500",
    Клей: "300",
    Песок: "500",
  };

  for (const [name, quantity] of Object.entries(amounts)) {
    const material = await prisma.material.findFirst({ where: { name } });
    if (!material) continue;
    const stock = await prisma.stockItem.findFirst({
      where: { warehouseId: raw.id, materialId: material.id },
    });
    if (stock && D(String(stock.qtyOnHand)).gt(0)) continue;
    const unitCost = material.averagePurchasePrice ?? material.lastPurchasePrice ?? "1";
    await receiveMaterial({
      warehouseId: raw.id,
      materialId: material.id,
      quantity,
      unitCost: String(unitCost),
      userId: owner.id,
      reason: "Начальный остаток (seed)",
      idempotencyKey: `seed-opening-${material.id}`,
    });
  }
}
