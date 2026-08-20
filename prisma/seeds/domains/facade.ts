import type { PrismaClient } from "@prisma/client";
import Decimal from "decimal.js";
import { persistDomainSettings } from "../persist-domain-settings";
import { FACADE_DOMAIN_CONFIG } from "../../../src/domains/facade/config";
import {
  FACADE_MATERIALS,
  FACADE_OPENING_STOCK,
  FACADE_PRODUCTS,
  type FacadeProductDef,
} from "../../../src/domains/facade/catalog";
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
  if (process.env.SEED_DEMO !== "0") {
    await seedFacadeOpeningStock(prisma);
  }

  return { productionSchemeId: prodScheme.id };
}

async function seedFacadeCatalog(prisma: PrismaClient) {
  const kg = await prisma.unit.findUniqueOrThrow({ where: { code: "KG" } });
  const g = await prisma.unit.findUniqueOrThrow({ where: { code: "G" } });
  const m2 = await prisma.unit.findUniqueOrThrow({ where: { code: "M2" } });
  const pcs = await prisma.unit.findUniqueOrThrow({ where: { code: "PCS" } });
  const bucket = await prisma.unit.findUniqueOrThrow({ where: { code: "BUCKET" } });

  const unitByCode = { KG: kg, G: g, BUCKET: bucket };

  async function upsertMaterial(data: (typeof FACADE_MATERIALS)[number]) {
    const existing = await prisma.material.findFirst({ where: { name: data.name } });
    const purchaseUnit = data.purchaseUnit === "BUCKET" ? bucket : kg;
    const row =
      existing ??
      (await prisma.material.create({
        data: {
          name: data.name,
          category: data.category,
          storageUnitId: kg.id,
          purchaseUnitId: purchaseUnit.id,
          packageWeight: data.packageWeight,
          packagePrice: data.packagePrice,
          minStock: data.minStock,
          lastPurchasePrice: data.packagePrice === "0" ? null : undefined,
        },
      }));

    if (!existing && data.packagePrice !== "0") {
      const unitPrice = new Decimal(data.packagePrice).div(data.packageWeight).toFixed(6);
      await prisma.materialPriceHistory.create({
        data: {
          materialId: row.id,
          packageWeight: data.packageWeight,
          packagePrice: data.packagePrice,
          unitPrice,
        },
      });
      await prisma.material.update({
        where: { id: row.id },
        data: {
          lastPurchasePrice: unitPrice,
          averagePurchasePrice: unitPrice,
        },
      });
    }

    if (existing && D(String(row.packagePrice)).lte(0) && data.packagePrice !== "0") {
      const unitPrice = new Decimal(data.packagePrice).div(data.packageWeight).toFixed(6);
      await prisma.material.update({
        where: { id: row.id },
        data: {
          packagePrice: data.packagePrice,
          lastPurchasePrice: unitPrice,
          averagePurchasePrice: unitPrice,
        },
      });
      await prisma.materialPriceHistory.create({
        data: {
          materialId: row.id,
          packageWeight: data.packageWeight,
          packagePrice: data.packagePrice,
          unitPrice,
        },
      });
    }

    return row;
  }

  const materialsByName = new Map<string, { id: string }>();
  for (const def of FACADE_MATERIALS) {
    const row = await upsertMaterial(def);
    materialsByName.set(def.name, row);
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

  async function ensureRecipe(productId: string, def: FacadeProductDef) {
    let recipe = await prisma.recipe.findUnique({ where: { productId } });
    if (!recipe) {
      recipe = await prisma.recipe.create({ data: { productId } });
    }

    const hasVersion = await prisma.recipeVersion.findFirst({
      where: { recipeId: recipe.id },
    });
    if (hasVersion) return;

    await prisma.recipeVersion.create({
      data: {
        recipeId: recipe.id,
        versionNumber: 1,
        comment: def.recipeComment,
        items: {
          create: def.recipeItems.map((item) => {
            const material = materialsByName.get(item.materialName);
            if (!material) {
              throw new Error(`Facade catalog: material "${item.materialName}" missing for ${def.name}`);
            }
            return {
              materialId: material.id,
              quantity: item.quantity,
              unitId: unitByCode[item.unitCode].id,
            };
          }),
        },
      },
    });
  }

  const { defaultCategory } = FACADE_DOMAIN_CONFIG.product;

  for (const def of FACADE_PRODUCTS) {
    let product = await prisma.product.findFirst({ where: { name: def.name } });
    if (!product) {
      product = await prisma.product.create({
        data: {
          name: def.name,
          category: defaultCategory,
          saleUnitId: m2.id,
          outputUnitId: pcs.id,
          recipeBaseQty: "1",
          outputPerBase: String(def.outputPerBase),
          minPrice: def.minPrice,
          recipe: { create: {} },
        },
      });
      await prisma.productPrice.create({ data: { productId: product.id, price: def.price } });
    } else {
      await ensureProductPrice(product.id, def.price);
      await prisma.product.update({
        where: { id: product.id },
        data: {
          minPrice: def.minPrice,
          outputPerBase: String(def.outputPerBase),
          category: defaultCategory,
        },
      });
    }

    await ensureRecipe(product.id, def);
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

  for (const [name, quantity] of Object.entries(FACADE_OPENING_STOCK)) {
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
