import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import Decimal from "decimal.js";
import { DEMO_PASSWORD, DEMO_USERS } from "../src/lib/demo-users";
import { PERMISSIONS, ROLE_PERMISSIONS } from "../src/lib/permissions";
import { DEFAULT_SETTINGS, DOMAIN_SETTING_KEYS, SETTING_KEYS } from "../src/lib/settings";
import { FACADE_DOMAIN_CONFIG } from "../src/domains/facade/config";
import { receiveMaterial } from "../src/lib/stock";
import { seedWorkshopHistory } from "./seed-history";

const prisma = new PrismaClient({
  transactionOptions: {
    maxWait: 15_000,
    timeout: 30_000,
  },
});
const D = (v: string) => new Decimal(v);

async function main() {
  for (const [code, meta] of Object.entries(PERMISSIONS)) {
    await prisma.permission.upsert({
      where: { code },
      update: { name: meta.name, module: meta.module },
      create: { code, name: meta.name, module: meta.module },
    });
  }

  const roleDefs = [
    { code: "owner", name: "Owner", description: "Полный доступ" },
    { code: "director", name: "Director", description: "Управление бизнесом" },
    { code: "sales_manager", name: "Sales Manager", description: "CRM и продажи" },
    { code: "production_manager", name: "Production Manager", description: "Производство" },
    { code: "worker", name: "Worker", description: "Только свои задания" },
    { code: "employee", name: "Employee", description: "Сотрудник с индивидуальными правами" },
    { code: "warehouse_manager", name: "Warehouse Manager", description: "Склад" },
    { code: "accountant", name: "Accountant", description: "Финансы" },
  ];

  for (const role of roleDefs) {
    const saved = await prisma.role.upsert({
      where: { code: role.code },
      update: { name: role.name, description: role.description, isSystem: true },
      create: { ...role, isSystem: true },
    });

    const codes = ROLE_PERMISSIONS[role.code] ?? [];
    const permissions = await prisma.permission.findMany({
      where: { code: { in: codes } },
    });

    await prisma.rolePermission.deleteMany({ where: { roleId: saved.id } });
    if (permissions.length > 0) {
      await prisma.rolePermission.createMany({
        data: permissions.map((p) => ({ roleId: saved.id, permissionId: p.id })),
      });
    }
  }

  const kg = await prisma.unit.upsert({
    where: { code: "KG" },
    update: {},
    create: {
      code: "KG",
      name: "Килограмм",
      symbol: "кг",
      category: "mass",
      isBase: true,
      toBaseFactor: 1,
    },
  });

  const m2 = await prisma.unit.upsert({
    where: { code: "M2" },
    update: {},
    create: {
      code: "M2",
      name: "Квадратный метр",
      symbol: "м²",
      category: "area",
      isBase: true,
      toBaseFactor: 1,
    },
  });

  await prisma.unit.upsert({
    where: { code: "PCS" },
    update: {},
    create: {
      code: "PCS",
      name: "Штука",
      symbol: "шт",
      category: "count",
      isBase: true,
      toBaseFactor: 1,
    },
  });

  await prisma.unit.upsert({
    where: { code: "PACK" },
    update: {},
    create: {
      code: "PACK",
      name: "Упаковка",
      symbol: "упак",
      category: "count",
      isBase: false,
      toBaseFactor: 1,
    },
  });

  await prisma.unit.upsert({
    where: { code: "LM" },
    update: {},
    create: {
      code: "LM",
      name: "Погонный метр",
      symbol: "пог. м",
      category: "length",
      isBase: true,
      toBaseFactor: 1,
    },
  });

  await prisma.unit.upsert({
    where: { code: "G" },
    update: {},
    create: {
      code: "G",
      name: "Грамм",
      symbol: "г",
      category: "mass",
      isBase: false,
      baseUnitId: kg.id,
      toBaseFactor: "0.001",
    },
  });

  await prisma.unit.upsert({
    where: { code: "BUCKET" },
    update: {},
    create: {
      code: "BUCKET",
      name: "Ведро",
      symbol: "ведро",
      category: "volume",
      isBase: false,
      baseUnitId: kg.id,
      toBaseFactor: 1,
    },
  });

  void m2;

  const settings: Record<string, string> = {
    [SETTING_KEYS.companyName]: DEFAULT_SETTINGS.companyName,
    [SETTING_KEYS.logoUrl]: DEFAULT_SETTINGS.logoUrl,
    [SETTING_KEYS.currencyCode]: DEFAULT_SETTINGS.currencyCode,
    [SETTING_KEYS.currencyName]: DEFAULT_SETTINGS.currencyName,
    [SETTING_KEYS.timezone]: DEFAULT_SETTINGS.timezone,
    [SETTING_KEYS.discountLimitPercent]: DEFAULT_SETTINGS.discountLimitPercent,
    [SETTING_KEYS.opexReservePercent]: DEFAULT_SETTINGS.opexReservePercent,
    [DOMAIN_SETTING_KEYS.workshopDomain]: FACADE_DOMAIN_CONFIG.domain,
    [DOMAIN_SETTING_KEYS.warehouseRawCode]: FACADE_DOMAIN_CONFIG.warehouses.rawCode,
    [DOMAIN_SETTING_KEYS.warehouseFgCode]: FACADE_DOMAIN_CONFIG.warehouses.fgCode,
    [DOMAIN_SETTING_KEYS.payrollProductionScheme]: FACADE_DOMAIN_CONFIG.payroll.productionScheme,
    [DOMAIN_SETTING_KEYS.productDefaultSaleUnit]: FACADE_DOMAIN_CONFIG.product.defaultSaleUnit,
    [DOMAIN_SETTING_KEYS.productDefaultOutputUnit]: FACADE_DOMAIN_CONFIG.product.defaultOutputUnit,
    [DOMAIN_SETTING_KEYS.productDefaultCategory]: FACADE_DOMAIN_CONFIG.product.defaultCategory,
  };

  for (const [key, value] of Object.entries(settings)) {
    await prisma.setting.upsert({
      where: { key },
      update: {},
      create: { key, value },
    });
  }

  const ownerRole = await prisma.role.findUniqueOrThrow({ where: { code: "owner" } });
  const email = process.env.OWNER_EMAIL ?? "owner@workshop.local";
  const password = process.env.OWNER_PASSWORD ?? DEMO_PASSWORD;
  const passwordHash = await bcrypt.hash(password, 12);

  await prisma.user.upsert({
    where: { email },
    update: { passwordHash, roleId: ownerRole.id },
    create: {
      email,
      name: "Владелец",
      passwordHash,
      roleId: ownerRole.id,
    },
  });

  await seedCatalog();
  await prisma.warehouse.upsert({
    where: { code: FACADE_DOMAIN_CONFIG.warehouses.rawCode },
    update: { name: "Склад сырья", kind: "material" },
    create: {
      code: FACADE_DOMAIN_CONFIG.warehouses.rawCode,
      name: "Склад сырья",
      kind: "material",
    },
  });
  await prisma.warehouse.upsert({
    where: { code: FACADE_DOMAIN_CONFIG.warehouses.fgCode },
    update: { name: "Склад готовой продукции", kind: "finished" },
    create: {
      code: FACADE_DOMAIN_CONFIG.warehouses.fgCode,
      name: "Склад готовой продукции",
      kind: "finished",
    },
  });

  const leadStages = [
    { code: "NEW", name: "Новый лид", sortOrder: 10, isLost: false, isWon: false },
    { code: "CONTACTED", name: "Связались", sortOrder: 20, isLost: false, isWon: false },
    { code: "CALC", name: "Расчёт", sortOrder: 30, isLost: false, isWon: false },
    { code: "OFFER", name: "Предложение", sortOrder: 40, isLost: false, isWon: false },
    { code: "THINKING", name: "Думает", sortOrder: 50, isLost: false, isWon: false },
    { code: "ORDER", name: "Заказ", sortOrder: 60, isLost: false, isWon: false },
    { code: "PAYMENT", name: "Оплата", sortOrder: 70, isLost: false, isWon: false },
    { code: "WON", name: "Выигран", sortOrder: 80, isLost: false, isWon: true },
    { code: "LOST", name: "Проигран", sortOrder: 90, isLost: true, isWon: false },
  ];
  for (const stage of leadStages) {
    await prisma.leadStage.upsert({
      where: { code: stage.code },
      update: { name: stage.name, sortOrder: stage.sortOrder, isLost: stage.isLost, isWon: stage.isWon },
      create: stage,
    });
  }

  const orderStatuses = [
    { code: "NEW", name: "Новый", sortOrder: 10, isTerminal: false },
    { code: "AWAITING_PAYMENT", name: "Ожидает оплаты", sortOrder: 20, isTerminal: false },
    { code: "CONFIRMED", name: "Подтверждён", sortOrder: 30, isTerminal: false },
    { code: "SCHEDULED", name: "Запланирован", sortOrder: 40, isTerminal: false },
    { code: "IN_PRODUCTION", name: "В производстве", sortOrder: 50, isTerminal: false },
    { code: "READY", name: "Готов", sortOrder: 60, isTerminal: false },
    { code: "IN_FG", name: "На складе ГП", sortOrder: 70, isTerminal: false },
    { code: "ISSUED", name: "Выдан клиенту", sortOrder: 80, isTerminal: false },
    { code: "COMPLETED", name: "Завершён", sortOrder: 90, isTerminal: true },
    { code: "CANCELLED", name: "Отменён", sortOrder: 100, isTerminal: true },
    { code: "RETURN", name: "Возврат", sortOrder: 110, isTerminal: true },
    { code: "PARTIAL", name: "Частично выполнен", sortOrder: 55, isTerminal: false },
    { code: "ON_HOLD", name: "Приостановлен", sortOrder: 25, isTerminal: false },
  ];
  for (const status of orderStatuses) {
    await prisma.orderStatus.upsert({
      where: { code: status.code },
      update: { name: status.name, sortOrder: status.sortOrder, isTerminal: status.isTerminal },
      create: { ...status, isSystem: true },
    });
  }

  await prisma.cashAccount.upsert({
    where: { code: "CASH" },
    update: { name: "Касса", kind: "cash" },
    create: { code: "CASH", name: "Касса", kind: "cash" },
  });
  await prisma.cashAccount.upsert({
    where: { code: "BANK" },
    update: { name: "Банк", kind: "bank" },
    create: { code: "BANK", name: "Банк", kind: "bank" },
  });
  const funds = [
    { code: "MATERIALS", name: "Производство / Закупки", sortOrder: 10 },
    { code: "LABOR", name: "Зарплата производства", sortOrder: 15 },
    { code: "COMMISSION", name: "Комиссия продавцов", sortOrder: 18 },
    { code: "OPEX", name: "Операционные расходы", sortOrder: 20 },
    { code: "PROFIT", name: "Прибыль владельца", sortOrder: 30 },
  ];
  for (const fund of funds) {
    await prisma.financialFund.upsert({
      where: { code: fund.code },
      update: { name: fund.name, sortOrder: fund.sortOrder },
      create: fund,
    });
  }
  const categories = [
    { code: "RENT", name: "Аренда", fundCode: "OPEX" },
    { code: "ELECTRICITY", name: "Электричество", fundCode: "OPEX" },
    { code: "SALARY", name: "Зарплата", fundCode: "OPEX" },
    { code: "RAW", name: "Сырьё", fundCode: "MATERIALS" },
    { code: "TRANSPORT", name: "Транспорт", fundCode: "OPEX" },
    { code: "REPAIR", name: "Ремонт", fundCode: "OPEX" },
    { code: "EQUIPMENT", name: "Оборудование", fundCode: "OPEX" },
    { code: "ADS", name: "Реклама", fundCode: "OPEX" },
    { code: "TAX", name: "Налоги", fundCode: "OPEX" },
    { code: "FOOD", name: "Питание", fundCode: "OPEX" },
    { code: "OTHER", name: "Другое", fundCode: "OPEX" },
  ];
  for (const cat of categories) {
    await prisma.expenseCategory.upsert({
      where: { code: cat.code },
      update: { name: cat.name, fundCode: cat.fundCode },
      create: { ...cat, isSystem: true },
    });
  }

  const prodScheme = await prisma.payScheme.upsert({
    where: { code: "production_m2" },
    update: { name: "Производство, с/м²", kind: "PRODUCTION_M2", productionRate: "22" },
    create: {
      code: "production_m2",
      name: "Производство, с/м²",
      kind: "PRODUCTION_M2",
      productionRate: "22",
    },
  });
  const salesScheme = await prisma.payScheme.upsert({
    where: { code: "sales_commission" },
    update: {
      name: "Комиссия продавца",
      kind: "SALES_COMMISSION",
      commissionMode: "PROGRESSIVE",
      commissionBase: "PAID",
    },
    create: {
      code: "sales_commission",
      name: "Комиссия продавца",
      kind: "SALES_COMMISSION",
      commissionMode: "PROGRESSIVE",
      commissionBase: "PAID",
    },
  });
  const tierCount = await prisma.commissionTier.count({ where: { schemeId: salesScheme.id } });
  if (tierCount === 0) {
    await prisma.commissionTier.createMany({
      data: [
        { schemeId: salesScheme.id, fromCount: 1, toCount: 10, percent: "3" },
        { schemeId: salesScheme.id, fromCount: 11, toCount: 15, percent: "4" },
        { schemeId: salesScheme.id, fromCount: 16, toCount: null, percent: "5" },
      ],
    });
  }
  void prodScheme;

  const demoHash = await bcrypt.hash("ChangeMeNow!", 12);
  await seedDemoUsers(demoHash, prodScheme.id, salesScheme.id);
  await seedOpeningStock();
  await seedWorkshopHistory(prisma);
}

async function seedCatalog() {
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

  // Seed uses Decimal strings; unit price is written via Prisma after create to avoid float as source.
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
  const sandPrice = "15"; // условно за ведро — уточнить при первой закупке
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

  let tile = await prisma.product.findFirst({ where: { name: "Фасадная плитка" } });
  if (!tile) {
    tile = await prisma.product.create({
      data: {
        name: "Фасадная плитка",
        category: "Фасад",
        saleUnitId: m2.id,
        outputUnitId: pcs.id,
        recipeBaseQty: "1",
        outputPerBase: "10",
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
        category: "Фасад",
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

async function seedDemoUsers(passwordHash: string, productionSchemeId: string, salesSchemeId: string) {
  const roleCodes = DEMO_USERS.filter((u) => u.roleCode !== "owner").map((u) => u.roleCode);
  const roles = await prisma.role.findMany({ where: { code: { in: roleCodes } } });
  const byCode = Object.fromEntries(roles.map((r) => [r.code, r]));

  const paySchemeByRole: Partial<Record<string, string | null>> = {
    sales_manager: salesSchemeId,
    worker: productionSchemeId,
    production_manager: productionSchemeId,
  };

  for (const user of DEMO_USERS) {
    if (user.roleCode === "owner") continue;
    const role = byCode[user.roleCode];
    if (!role) continue;
    const paySchemeId = paySchemeByRole[user.roleCode] ?? null;
    await prisma.user.upsert({
      where: { email: user.email },
      update: { name: user.name, roleId: role.id, paySchemeId, passwordHash },
      create: {
        email: user.email,
        name: user.name,
        passwordHash,
        roleId: role.id,
        paySchemeId,
      },
    });
  }
}

async function seedOpeningStock() {
  const raw = await prisma.warehouse.findUnique({
    where: { code: FACADE_DOMAIN_CONFIG.warehouses.rawCode },
  });
  const owner = await prisma.user.findFirst({ where: { email: process.env.OWNER_EMAIL ?? "owner@workshop.local" } });
  if (!raw || !owner) return;

  const amounts: Record<string, string> = {
    "Белый цемент": "2000",
    "Краска": "500",
    "Клей": "300",
    "Песок": "500",
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

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
