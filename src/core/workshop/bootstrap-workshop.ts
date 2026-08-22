import type { PrismaClient } from "@prisma/client";
import { DEFAULT_SETTINGS, SETTING_KEYS } from "@core/config/settings";
import { DEFAULT_WORKSHOP_ID, WORKSHOP_2_ID } from "@core/workshop/workshop-context";

const RAW_CODE = "RAW";
const FG_CODE = "FG";

export async function ensureDefaultWorkshop(prisma: PrismaClient) {
  await prisma.workshop.upsert({
    where: { id: DEFAULT_WORKSHOP_ID },
    update: { name: "Цех 1", slug: "ceh-1", isActive: true },
    create: {
      id: DEFAULT_WORKSHOP_ID,
      name: "Цех 1",
      slug: "ceh-1",
      isActive: true,
    },
  });
}

export async function ensureSecondWorkshop(prisma: PrismaClient) {
  await prisma.workshop.upsert({
    where: { id: WORKSHOP_2_ID },
    update: { name: "Цех 2", slug: "ceh-2", isActive: true },
    create: {
      id: WORKSHOP_2_ID,
      name: "Цех 2",
      slug: "ceh-2",
      isActive: true,
    },
  });
}

export async function ensureTwoWorkshops(prisma: PrismaClient) {
  await ensureDefaultWorkshop(prisma);
  await ensureSecondWorkshop(prisma);
}

export async function bootstrapWorkshopStructure(prisma: PrismaClient, workshopId: string) {
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
      where: { workshopId_key: { workshopId, key } },
      update: {},
      create: { workshopId, key, value },
    });
  }

  await prisma.warehouse.upsert({
    where: { workshopId_code: { workshopId, code: RAW_CODE } },
    update: { name: "Склад сырья", kind: "material" },
    create: { workshopId, code: RAW_CODE, name: "Склад сырья", kind: "material" },
  });
  await prisma.warehouse.upsert({
    where: { workshopId_code: { workshopId, code: FG_CODE } },
    update: { name: "Склад готовой продукции", kind: "finished" },
    create: { workshopId, code: FG_CODE, name: "Склад готовой продукции", kind: "finished" },
  });

  const leadStages = [
    { code: "NEW", name: "Новый лид", sortOrder: 10, isLost: false, isWon: false },
    { code: "CONTACTED", name: "Связались", sortOrder: 20, isLost: false, isWon: false },
    { code: "CALC", name: "Расчёт", sortOrder: 30, isLost: false, isWon: false },
    { code: "OFFER", name: "Предложение", sortOrder: 40, isLost: false, isWon: false },
    { code: "THINKING", name: "Думает", sortOrder: 50, isLost: false, isWon: false },
    { code: "ORDER", name: "Заказ", sortOrder: 60, isLost: false, isWon: false },
    { code: "PAYMENT", name: "Оплата", sortOrder: 70, isLost: false, isWon: false },
    { code: "PAID", name: "Оплата", sortOrder: 75, isLost: false, isWon: false },
    { code: "WON", name: "Выигран", sortOrder: 80, isLost: false, isWon: true },
    { code: "LOST", name: "Проигран", sortOrder: 90, isLost: true, isWon: false },
  ];
  for (const stage of leadStages) {
    await prisma.leadStage.upsert({
      where: { workshopId_code: { workshopId, code: stage.code } },
      update: { name: stage.name, sortOrder: stage.sortOrder, isLost: stage.isLost, isWon: stage.isWon },
      create: { workshopId, ...stage },
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
      where: { workshopId_code: { workshopId, code: status.code } },
      update: { name: status.name, sortOrder: status.sortOrder, isTerminal: status.isTerminal },
      create: { workshopId, ...status, isSystem: true },
    });
  }

  await prisma.cashAccount.upsert({
    where: { workshopId_code: { workshopId, code: "CASH" } },
    update: { name: "Касса", kind: "cash" },
    create: { workshopId, code: "CASH", name: "Касса", kind: "cash" },
  });
  await prisma.cashAccount.upsert({
    where: { workshopId_code: { workshopId, code: "BANK" } },
    update: { name: "Счёт карты", kind: "bank" },
    create: { workshopId, code: "BANK", name: "Счёт карты", kind: "bank" },
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
      where: { workshopId_code: { workshopId, code: fund.code } },
      update: { name: fund.name, sortOrder: fund.sortOrder },
      create: { workshopId, ...fund },
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
      where: { workshopId_code: { workshopId, code: cat.code } },
      update: { name: cat.name, fundCode: cat.fundCode },
      create: { workshopId, ...cat, isSystem: true },
    });
  }

  await prisma.payScheme.upsert({
    where: { workshopId_code: { workshopId, code: "sales_commission" } },
    update: {
      name: "Комиссия продавца",
      kind: "SALES_COMMISSION",
      commissionMode: "PROGRESSIVE",
      commissionBase: "PAID",
    },
    create: {
      workshopId,
      code: "sales_commission",
      name: "Комиссия продавца",
      kind: "SALES_COMMISSION",
      commissionMode: "PROGRESSIVE",
      commissionBase: "PAID",
    },
  });

  await prisma.payScheme.upsert({
    where: { workshopId_code: { workshopId, code: "production_piece" } },
    update: { name: "Сдельная оплата", kind: "PRODUCTION_PIECE" },
    create: {
      workshopId,
      code: "production_piece",
      name: "Сдельная оплата",
      kind: "PRODUCTION_PIECE",
    },
  });

  const salesScheme = await prisma.payScheme.findUniqueOrThrow({
    where: { workshopId_code: { workshopId, code: "sales_commission" } },
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

  const productionStages = [
    { code: "MIX", name: "Замес", sortOrder: 10 },
    { code: "FORM", name: "Формовка", sortOrder: 20 },
    { code: "DRY", name: "Сушка", sortOrder: 30 },
    { code: "PACK", name: "Упаковка", sortOrder: 40 },
  ];
  for (const stage of productionStages) {
    await prisma.productionStage.upsert({
      where: { workshopId_code: { workshopId, code: stage.code } },
      update: { name: stage.name, sortOrder: stage.sortOrder, isActive: true },
      create: { workshopId, ...stage, isActive: true },
    });
  }
}
