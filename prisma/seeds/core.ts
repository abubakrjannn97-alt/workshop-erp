import type { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import { DEMO_PASSWORD } from "../../src/core/auth/demo-users";
import { PERMISSIONS, ROLE_PERMISSIONS } from "../../src/core/rbac/permissions";
import { DEFAULT_SETTINGS, SETTING_KEYS } from "../../src/core/config/settings";
const CORE_WAREHOUSE_RAW_CODE = "RAW";
const CORE_WAREHOUSE_FG_CODE = "FG";

const ROLE_DEFS = [
  { code: "owner", name: "Owner", description: "Полный доступ" },
  { code: "director", name: "Director", description: "Управление бизнесом" },
  { code: "sales_manager", name: "Sales Manager", description: "CRM и продажи" },
  { code: "production_manager", name: "Production Manager", description: "Производство" },
  { code: "worker", name: "Worker", description: "Только свои задания" },
  { code: "employee", name: "Employee", description: "Сотрудник с индивидуальными правами" },
  { code: "warehouse_manager", name: "Warehouse Manager", description: "Склад" },
  { code: "accountant", name: "Accountant", description: "Финансы" },
];

/** Universal CORE seed — no facade catalog, products, recipes, or demo history. */
export async function seedCore(prisma: PrismaClient) {
  for (const [code, meta] of Object.entries(PERMISSIONS)) {
    await prisma.permission.upsert({
      where: { code },
      update: { name: meta.name, module: meta.module },
      create: { code, name: meta.name, module: meta.module },
    });
  }

  for (const role of ROLE_DEFS) {
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

  await prisma.unit.upsert({
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

  const businessSettings: Record<string, string> = {
    [SETTING_KEYS.companyName]: DEFAULT_SETTINGS.companyName,
    [SETTING_KEYS.logoUrl]: DEFAULT_SETTINGS.logoUrl,
    [SETTING_KEYS.currencyCode]: DEFAULT_SETTINGS.currencyCode,
    [SETTING_KEYS.currencyName]: DEFAULT_SETTINGS.currencyName,
    [SETTING_KEYS.timezone]: DEFAULT_SETTINGS.timezone,
    [SETTING_KEYS.discountLimitPercent]: DEFAULT_SETTINGS.discountLimitPercent,
    [SETTING_KEYS.opexReservePercent]: DEFAULT_SETTINGS.opexReservePercent,
  };

  for (const [key, value] of Object.entries(businessSettings)) {
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

  await prisma.warehouse.upsert({
    where: { code: CORE_WAREHOUSE_RAW_CODE },
    update: { name: "Склад сырья", kind: "material" },
    create: {
      code: CORE_WAREHOUSE_RAW_CODE,
      name: "Склад сырья",
      kind: "material",
    },
  });
  await prisma.warehouse.upsert({
    where: { code: CORE_WAREHOUSE_FG_CODE },
    update: { name: "Склад готовой продукции", kind: "finished" },
    create: {
      code: CORE_WAREHOUSE_FG_CODE,
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

  return { salesSchemeId: salesScheme.id };
}
