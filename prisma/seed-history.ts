import type { PrismaClient } from "@prisma/client";
import Decimal from "decimal.js";

const D = (v: string | number) => new Decimal(v);
const money = (v: number) => D(v).toFixed(2);
const qty = (v: number) => D(v).toFixed(6);

function monthsAgo(months: number, day: number, hour = 10) {
  const d = new Date();
  d.setMonth(d.getMonth() - months);
  d.setDate(Math.min(day, 28));
  d.setHours(hour, 18, 0, 0);
  return d;
}

function daysAgo(n: number, hour = 11) {
  const d = new Date();
  d.setDate(d.getDate() - n);
  d.setHours(hour, 25, 0, 0);
  return d;
}

export async function seedWorkshopHistory(prisma: PrismaClient) {
  const already = await prisma.customer.findFirst({ where: { source: "seed" } });
  if (already) {
    console.log("Demo history already present — skip.");
    return;
  }

  const owner = await prisma.user.findFirst({ where: { email: process.env.OWNER_EMAIL ?? "owner@workshop.local" } });
  const sales = await prisma.user.findFirst({ where: { email: "sales@workshop.local" } });
  const worker = await prisma.user.findFirst({ where: { email: "worker@workshop.local" } });
  if (!owner || !sales) {
    console.warn("Demo history skipped: owner/sales user missing.");
    return;
  }

  const tile = await prisma.product.findFirst({ where: { name: "Фасадная плитка" } });
  const stone = await prisma.product.findFirst({ where: { name: "Декоративный камень" } });
  if (!tile || !stone) {
    console.warn("Demo history skipped: catalog products missing.");
    return;
  }

  const statuses = await prisma.orderStatus.findMany();
  const statusId = Object.fromEntries(statuses.map((s) => [s.code, s.id]));
  const cash = await prisma.cashAccount.findUnique({ where: { code: "CASH" } });
  const funds = await prisma.financialFund.findMany();
  const fundId = Object.fromEntries(funds.map((f) => [f.code, f.id]));
  const rent = await prisma.expenseCategory.findUnique({ where: { code: "RENT" } });
  const power = await prisma.expenseCategory.findUnique({ where: { code: "ELECTRICITY" } });
  const stages = await prisma.leadStage.findMany();
  const stageId = Object.fromEntries(stages.map((s) => [s.code, s.id]));
  const white = await prisma.material.findFirst({ where: { name: "Белый цемент" } });
  const paint = await prisma.material.findFirst({ where: { name: "Краска" } });

  if (!cash || !fundId.MATERIALS || !fundId.PROFIT || !fundId.OPEX) {
    console.warn("Demo history skipped: finance catalog missing.");
    return;
  }

  const customerDefs = [
    { name: "ООО «Фасад Плюс»", phone: "+992 90 111 2233", address: "Душанбе, р. Сино" },
    { name: "Каримов А.", phone: "+992 93 555 0102", address: "Душанбе" },
    { name: "ЧДММ «Душанбе Строй»", phone: "+992 37 221 4455", address: "пр. Рудаки 47" },
    { name: "Раҳимова М.", phone: "+992 92 777 8899", address: "Худжанд" },
    { name: "Исмоилов С.", phone: "+992 98 333 1212", address: "Ваҳдат" },
    { name: "ООО «Нур»", phone: "+992 90 444 5566", address: "Душанбе, р. Фирдавсӣ" },
    { name: "Саидов Б.", phone: "+992 93 210 3344", address: "Турсунзода" },
    { name: "Меҳмонхона «Ватан»", phone: "+992 37 227 1001", address: "ул. Айнӣ 12" },
    { name: "Хусейнов Р.", phone: "+992 91 800 2323", address: "Ҳисор" },
    { name: "«Ориён Керамика»", phone: "+992 90 612 7878", address: "Душанбе" },
  ];

  const customers = [];
  for (const row of customerDefs) {
    customers.push(
      await prisma.customer.create({
        data: {
          ...row,
          source: "seed",
          managerId: sales.id,
          comment: "Тестовый клиент (несколько месяцев работы цеха)",
          createdAt: monthsAgo(4, 2),
        },
      }),
    );
  }

  const price = { tile: 150, stone: 180 };
  const matCost = { tile: 54, stone: 80 };
  const laborRate = 22;

  type Draft = {
    agoDays?: number;
    monthAgo?: number;
    day?: number;
    customer: number;
    kind: "tile" | "stone";
    qty: number;
    status: string;
    pay: "paid" | "partial" | "unpaid";
    overdue?: boolean;
  };

  const drafts: Draft[] = [
    { monthAgo: 4, day: 4, customer: 0, kind: "tile", qty: 48, status: "COMPLETED", pay: "paid" },
    { monthAgo: 4, day: 9, customer: 1, kind: "stone", qty: 22, status: "ISSUED", pay: "paid" },
    { monthAgo: 4, day: 14, customer: 2, kind: "tile", qty: 80, status: "COMPLETED", pay: "paid" },
    { monthAgo: 4, day: 21, customer: 3, kind: "tile", qty: 36, status: "COMPLETED", pay: "paid" },
    { monthAgo: 4, day: 27, customer: 4, kind: "stone", qty: 18, status: "ISSUED", pay: "paid" },
    { monthAgo: 3, day: 3, customer: 5, kind: "tile", qty: 60, status: "COMPLETED", pay: "paid" },
    { monthAgo: 3, day: 8, customer: 6, kind: "tile", qty: 28, status: "COMPLETED", pay: "paid" },
    { monthAgo: 3, day: 13, customer: 7, kind: "stone", qty: 40, status: "ISSUED", pay: "paid" },
    { monthAgo: 3, day: 19, customer: 8, kind: "tile", qty: 52, status: "COMPLETED", pay: "paid" },
    { monthAgo: 3, day: 25, customer: 9, kind: "tile", qty: 24, status: "COMPLETED", pay: "paid" },
    { monthAgo: 2, day: 2, customer: 0, kind: "stone", qty: 30, status: "COMPLETED", pay: "paid" },
    { monthAgo: 2, day: 7, customer: 2, kind: "tile", qty: 90, status: "COMPLETED", pay: "paid" },
    { monthAgo: 2, day: 12, customer: 1, kind: "tile", qty: 16, status: "ISSUED", pay: "paid" },
    { monthAgo: 2, day: 18, customer: 5, kind: "tile", qty: 44, status: "COMPLETED", pay: "paid" },
    { monthAgo: 2, day: 24, customer: 3, kind: "stone", qty: 26, status: "COMPLETED", pay: "paid" },
    { monthAgo: 1, day: 4, customer: 7, kind: "tile", qty: 70, status: "COMPLETED", pay: "paid" },
    { monthAgo: 1, day: 9, customer: 4, kind: "tile", qty: 32, status: "ISSUED", pay: "paid" },
    { monthAgo: 1, day: 15, customer: 8, kind: "stone", qty: 20, status: "COMPLETED", pay: "paid" },
    { monthAgo: 1, day: 20, customer: 6, kind: "tile", qty: 55, status: "COMPLETED", pay: "partial" },
    { monthAgo: 1, day: 26, customer: 9, kind: "tile", qty: 38, status: "ISSUED", pay: "paid" },
    { agoDays: 12, customer: 0, kind: "tile", qty: 42, status: "COMPLETED", pay: "paid" },
    { agoDays: 9, customer: 2, kind: "stone", qty: 18, status: "ISSUED", pay: "paid" },
    { agoDays: 6, customer: 5, kind: "tile", qty: 50, status: "READY", pay: "paid" },
    { agoDays: 4, customer: 1, kind: "tile", qty: 35, status: "IN_PRODUCTION", pay: "paid", overdue: true },
    { agoDays: 3, customer: 7, kind: "stone", qty: 24, status: "IN_PRODUCTION", pay: "partial" },
    { agoDays: 2, customer: 3, kind: "tile", qty: 20, status: "CONFIRMED", pay: "unpaid" },
    { agoDays: 1, customer: 8, kind: "tile", qty: 28, status: "NEW", pay: "unpaid" },
  ];

  const maxNo = await prisma.order.aggregate({ _max: { number: true } });
  let number = (maxNo._max.number ?? 1000) + 1;

  for (const draft of drafts) {
    const createdAt =
      draft.agoDays != null ? daysAgo(draft.agoDays) : monthsAgo(draft.monthAgo ?? 0, draft.day ?? 10);
    const product = draft.kind === "tile" ? tile : stone;
    const unitPrice = price[draft.kind];
    const amount = draft.qty * unitPrice;
    const materialCost = draft.qty * matCost[draft.kind];
    const labor = draft.qty * laborRate;
    const paid =
      draft.pay === "paid" ? amount : draft.pay === "partial" ? Math.round(amount * 0.4) : 0;
    const dueAt = new Date(createdAt);
    dueAt.setDate(dueAt.getDate() + (draft.overdue ? -2 : 8));
    const sid = statusId[draft.status];
    if (!sid) continue;

    const order = await prisma.order.create({
      data: {
        number: number++,
        customerId: customers[draft.customer].id,
        sellerId: sales.id,
        statusId: sid,
        paymentStatus: draft.pay,
        paymentMethod: paid > 0 ? "cash" : null,
        dueAt,
        subtotal: money(amount),
        total: money(amount),
        paidAmount: money(paid),
        materialCost: money(materialCost),
        outputQty: qty(draft.qty),
        canProduceFully: true,
        createdById: sales.id,
        createdAt,
        updatedAt: createdAt,
        confirmedAt: draft.status === "NEW" ? null : createdAt,
        items: {
          create: {
            productId: product.id,
            quantity: qty(draft.qty),
            unitPrice: money(unitPrice),
            amount: money(amount),
            outputQty: qty(draft.qty),
          },
        },
      },
    });

    if (paid > 0) {
      const payAt = new Date(createdAt);
      payAt.setDate(payAt.getDate() + 1);
      const payment = await prisma.payment.create({
        data: {
          orderId: order.id,
          amount: money(paid),
          method: "cash",
          comment: "Тестовая оплата",
          idempotencyKey: `seed-pay-${order.id}`,
          createdById: sales.id,
          createdAt: payAt,
        },
      });
      const share = paid / amount;
      const toMat = Math.min(paid, materialCost * share);
      const restAfterMat = paid - toMat;
      const toLabor = Math.min(restAfterMat, labor * share);
      const toProfit = paid - toMat - toLabor;
      const ledgers = [
        { type: "CASH_IN", amount: paid, accountId: cash.id, fundId: null as string | null, comment: "Оплата клиента", key: "cash" },
        { type: "FUND_IN", amount: toMat, accountId: null, fundId: fundId.MATERIALS, comment: "Резерв сырья", key: "mat" },
        { type: "FUND_IN", amount: toLabor, accountId: null, fundId: fundId.LABOR, comment: "Резерв зарплаты", key: "lab" },
        { type: "FUND_IN", amount: toProfit, accountId: null, fundId: fundId.PROFIT, comment: "Доступная прибыль", key: "prf" },
      ];
      for (const row of ledgers) {
        if (row.amount <= 0) continue;
        if (row.type === "FUND_IN" && !row.fundId) continue;
        await prisma.ledgerEntry.create({
          data: {
            type: row.type,
            amount: money(row.amount),
            accountId: row.accountId,
            fundId: row.fundId,
            orderId: order.id,
            paymentId: payment.id,
            status: "POSTED",
            comment: row.comment,
            idempotencyKey: `seed-led-${row.key}-${order.id}`,
            createdById: owner.id,
            createdAt: payAt,
          },
        });
      }
    }

    if (draft.status !== "NEW") {
      const produced =
        draft.status === "COMPLETED" || draft.status === "ISSUED" || draft.status === "READY"
          ? draft.qty
          : draft.status === "IN_PRODUCTION"
            ? Math.round(draft.qty * 0.45)
            : 0;
      const prodStatus =
        produced >= draft.qty ? "DONE" : produced > 0 ? "IN_PROGRESS" : "OPEN";
      const production = await prisma.productionOrder.create({
        data: {
          orderId: order.id,
          status: prodStatus,
          plannedQty: qty(draft.qty),
          producedQty: qty(produced),
          dueAt,
          createdAt,
          updatedAt: createdAt,
        },
      });
      if (produced > 0) {
        await prisma.productionBatch.create({
          data: {
            productionOrderId: production.id,
            number: 1,
            status: produced >= draft.qty ? "CLOSED" : "OPEN",
            plannedQty: qty(draft.qty),
            actualQty: qty(produced),
            responsibleUserId: worker?.id ?? owner.id,
            producedAt: produced >= draft.qty ? daysAgo(Math.max(1, (draft.agoDays ?? 10) - 2)) : null,
            createdAt,
          },
        });
      }
    }
  }

  if (rent && power && fundId.OPEX) {
    for (let m = 4; m >= 0; m--) {
      const when = monthsAgo(m, 5, 9);
      const rentAmt = 4500;
      const powerAmt = 980 + m * 40;
      await prisma.ledgerEntry.create({
        data: {
          type: "CASH_OUT",
          amount: money(rentAmt),
          accountId: cash.id,
          fundId: fundId.OPEX,
          categoryId: rent.id,
          status: "POSTED",
          comment: "Аренда цеха",
          idempotencyKey: `seed-rent-${when.toISOString().slice(0, 7)}`,
          createdById: owner.id,
          createdAt: when,
        },
      });
      await prisma.ledgerEntry.create({
        data: {
          type: "CASH_OUT",
          amount: money(powerAmt),
          accountId: cash.id,
          fundId: fundId.OPEX,
          categoryId: power.id,
          status: "POSTED",
          comment: "Электричество",
          idempotencyKey: `seed-el-${when.toISOString().slice(0, 7)}`,
          createdById: owner.id,
          createdAt: when,
        },
      });
      await prisma.ledgerEntry.create({
        data: {
          type: "FUND_OUT",
          amount: money(rentAmt + powerAmt),
          fundId: fundId.OPEX,
          status: "POSTED",
          comment: "Списание OPEX",
          idempotencyKey: `seed-opex-${when.toISOString().slice(0, 7)}`,
          createdById: owner.id,
          createdAt: when,
        },
      });
    }
  }

  const supplier = await prisma.supplier.create({
    data: {
      name: "ООО «Цемент и краска»",
      phone: "+992 37 236 4500",
      contact: "Азизов",
      createdAt: monthsAgo(4, 1),
    },
  });
  if (white && paint) {
    await prisma.supplierMaterial.createMany({
      data: [
        { supplierId: supplier.id, materialId: white.id },
        { supplierId: supplier.id, materialId: paint.id },
      ],
    });
    const poTotal = 50 * 4 + 25 * 24;
    await prisma.purchaseOrder.create({
      data: {
        number: "PO-SEED-01",
        supplierId: supplier.id,
        status: "POSTED",
        total: money(poTotal),
        paidAmount: money(poTotal),
        comment: "Тестовая закупка",
        createdById: owner.id,
        createdAt: monthsAgo(2, 6),
        confirmedAt: monthsAgo(2, 6),
        receivedAt: monthsAgo(2, 8),
        items: {
          create: [
            {
              materialId: white.id,
              quantity: qty(50),
              unitPrice: money(4),
              amount: money(200),
              receivedQty: qty(50),
            },
            {
              materialId: paint.id,
              quantity: qty(25),
              unitPrice: money(24),
              amount: money(600),
              receivedQty: qty(25),
            },
          ],
        },
      },
    });
    await prisma.purchaseOrder.create({
      data: {
        number: "PO-SEED-02",
        supplierId: supplier.id,
        status: "ORDERED",
        total: money(800),
        paidAmount: money(0),
        comment: "Ожидает прихода",
        createdById: owner.id,
        createdAt: daysAgo(5),
        confirmedAt: daysAgo(4),
        items: {
          create: {
            materialId: white.id,
            quantity: qty(200),
            unitPrice: money(4),
            amount: money(800),
          },
        },
      },
    });
  }

  if (stageId.CONTACTED && stageId.CALC && stageId.OFFER && stageId.THINKING) {
    const leadRows = [
      { name: "ЧДММ «Суғд Фасад»", phone: "+992 92 111 0001", stage: "CONTACTED", comment: "Хотят 120 м² плитки" },
      { name: "Назаров Д.", phone: "+992 90 222 0002", stage: "CALC", comment: "Расчёт на камень" },
      { name: "ООО «Бунёд»", phone: "+992 37 221 0003", stage: "OFFER", comment: "КП отправлено" },
      { name: "Шарифзода А.", phone: "+992 93 333 0004", stage: "THINKING", comment: "Думает до пятницы" },
    ];
    for (const row of leadRows) {
      await prisma.lead.create({
        data: {
          name: row.name,
          phone: row.phone,
          stageId: stageId[row.stage],
          managerId: sales.id,
          comment: row.comment,
          createdAt: daysAgo(8),
        },
      });
    }
  }

  await prisma.obligation.createMany({
    data: [
      {
        kind: "TAX",
        name: "Налог за квартал",
        amount: money(1800),
        status: "OPEN",
        dueAt: daysAgo(-12),
        comment: "Тестовое обязательство",
        createdById: owner.id,
      },
      {
        kind: "RENT",
        name: "Аренда — следующий месяц",
        amount: money(4500),
        status: "OPEN",
        dueAt: daysAgo(-20),
        comment: "Тестовое обязательство",
        createdById: owner.id,
      },
    ],
  });

  console.log("Demo history seeded: ~4 months of workshop operations.");
}
