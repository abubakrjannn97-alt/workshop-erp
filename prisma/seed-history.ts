import type { PrismaClient } from "@prisma/client";
import Decimal from "decimal.js";

const D = (v: string | number) => new Decimal(v);
const money = (v: number) => D(v).toFixed(2);
const qty = (v: number) => D(v).toFixed(6);

function monthsAgo(months: number, day: number, hour = 10) {
  const d = new Date();
  d.setMonth(d.getMonth() - months);
  d.setDate(Math.min(day, 28));
  d.setHours(hour, 30, 0, 0);
  return d;
}

function daysAgo(n: number, hour = 11) {
  const d = new Date();
  d.setDate(d.getDate() - n);
  d.setHours(hour, 30, 0, 0);
  return d;
}

const SEED_LEAD_PHONES = ["+992 92 111 0001", "+992 90 222 0002", "+992 37 221 0003", "+992 93 333 0004"];

export async function clearDemoHistory(prisma: PrismaClient) {
  const seedCustomers = await prisma.customer.findMany({
    where: { source: "seed" },
    select: { id: true },
  });
  const customerIds = seedCustomers.map((c) => c.id);

  const seedPayments = await prisma.payment.findMany({
    where: { idempotencyKey: { startsWith: "seed-pay-" } },
    select: { orderId: true },
  });
  const seedOrderIdsFromPayments = seedPayments.map((p) => p.orderId);

  const linkedOrders = await prisma.order.findMany({
    where: {
      OR: [
        ...(customerIds.length ? [{ customerId: { in: customerIds } }] : []),
        ...(seedOrderIdsFromPayments.length ? [{ id: { in: seedOrderIdsFromPayments } }] : []),
      ],
    },
    select: { id: true, customerId: true },
  });
  const linkedOrderIds = [...new Set(linkedOrders.map((o) => o.id))];

  if (linkedOrderIds.length) {
    const linkedProduction = await prisma.productionOrder.findMany({
      where: { orderId: { in: linkedOrderIds } },
      select: { id: true },
    });
    const linkedProductionIds = linkedProduction.map((p) => p.id);

    if (linkedProductionIds.length) {
      const linkedBatches = await prisma.productionBatch.findMany({
        where: { productionOrderId: { in: linkedProductionIds } },
        select: { id: true },
      });
      const linkedBatchIds = linkedBatches.map((b) => b.id);

      if (linkedBatchIds.length) {
        await prisma.payrollAccrual.deleteMany({ where: { batchId: { in: linkedBatchIds } } });
        await prisma.batchMaterialUse.deleteMany({ where: { batchId: { in: linkedBatchIds } } });
        await prisma.scrapRecord.deleteMany({ where: { batchId: { in: linkedBatchIds } } });
        await prisma.productionBatch.deleteMany({ where: { id: { in: linkedBatchIds } } });
      }

      await prisma.productionOrder.deleteMany({ where: { id: { in: linkedProductionIds } } });
    }

    await prisma.productionOrder.deleteMany({ where: { orderId: { in: linkedOrderIds } } });

    await prisma.payrollAccrual.deleteMany({ where: { orderId: { in: linkedOrderIds } } });

    const linkedPayments = await prisma.payment.findMany({
      where: { orderId: { in: linkedOrderIds } },
      select: { id: true },
    });
    const linkedPaymentIds = linkedPayments.map((p) => p.id);

    if (linkedPaymentIds.length) {
      await prisma.payrollAccrual.deleteMany({ where: { paymentId: { in: linkedPaymentIds } } });
    }

    await prisma.ledgerEntry.deleteMany({
      where: {
        OR: [
          { idempotencyKey: { startsWith: "seed-" } },
          { orderId: { in: linkedOrderIds } },
          ...(linkedPaymentIds.length ? [{ paymentId: { in: linkedPaymentIds } }] : []),
        ],
      },
    });

    if (linkedPaymentIds.length) {
      await prisma.payment.deleteMany({ where: { id: { in: linkedPaymentIds } } });
    }

    await prisma.orderMaterialNeed.deleteMany({ where: { orderId: { in: linkedOrderIds } } });
    await prisma.orderItem.deleteMany({ where: { orderId: { in: linkedOrderIds } } });
    await prisma.order.deleteMany({ where: { id: { in: linkedOrderIds } } });
  }

  if (customerIds.length) {
    await prisma.lead.updateMany({
      where: { customerId: { in: customerIds } },
      data: { customerId: null },
    });
    await prisma.customer.deleteMany({ where: { source: "seed" } });
  }

  const seedPos = await prisma.purchaseOrder.findMany({
    where: { number: { startsWith: "PO-SEED" } },
    select: { id: true },
  });
  if (seedPos.length) {
    const poIds = seedPos.map((p) => p.id);
    await prisma.purchasePayment.deleteMany({ where: { purchaseOrderId: { in: poIds } } });
    await prisma.purchaseItem.deleteMany({ where: { purchaseOrderId: { in: poIds } } });
    await prisma.purchaseOrder.deleteMany({ where: { id: { in: poIds } } });
  }

  const seedSupplier = await prisma.supplier.findFirst({ where: { name: "ООО «Цемент и краска»" } });
  if (seedSupplier) {
    await prisma.supplierMaterial.deleteMany({ where: { supplierId: seedSupplier.id } });
    await prisma.supplier.delete({ where: { id: seedSupplier.id } });
  }

  await prisma.lead.deleteMany({ where: { phone: { in: SEED_LEAD_PHONES } } });
  await prisma.obligation.deleteMany({ where: { comment: "Тестовое обязательство" } });
  await prisma.notification.deleteMany({ where: { type: { startsWith: "seed_" } } });
  await prisma.cashShift.deleteMany({ where: { comment: "seed" } });

  console.log("Demo history cleared.");
}

export async function seedWorkshopHistory(prisma: PrismaClient, opts?: { force?: boolean }) {
  const force = opts?.force ?? process.env.FORCE_DEMO_SEED === "1";
  const already = await prisma.customer.findFirst({ where: { source: "seed" } });
  if (already && !force) {
    console.log("Demo history already present — skip. Run: npm run db:seed:demo");
    return;
  }
  if (already && force) {
    await clearDemoHistory(prisma);
  }

  const owner = await prisma.user.findFirst({ where: { email: process.env.OWNER_EMAIL ?? "owner@workshop.local" } });
  const sales = await prisma.user.findFirst({ where: { email: "sales@workshop.local" } });
  const worker = await prisma.user.findFirst({ where: { email: "worker@workshop.local" } });
  const accountant = await prisma.user.findFirst({ where: { email: "accountant@workshop.local" } });
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
  const bank = await prisma.cashAccount.findUnique({ where: { code: "BANK" } });
  const funds = await prisma.financialFund.findMany();
  const fundId = Object.fromEntries(funds.map((f) => [f.code, f.id]));
  const rent = await prisma.expenseCategory.findUnique({ where: { code: "RENT" } });
  const power = await prisma.expenseCategory.findUnique({ where: { code: "ELECTRICITY" } });
  const stages = await prisma.leadStage.findMany();
  const stageId = Object.fromEntries(stages.map((s) => [s.code, s.id]));
  const white = await prisma.material.findFirst({ where: { name: "Белый цемент" } });
  const paint = await prisma.material.findFirst({ where: { name: "Краска" } });
  const glue = await prisma.material.findFirst({ where: { name: "Клей" } });
  const rawWh = await prisma.warehouse.findUnique({ where: { code: "RAW" } });

  if (!cash || !fundId.MATERIALS || !fundId.PROFIT || !fundId.OPEX || !fundId.LABOR) {
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
    { name: "ЧДММ «Сомон»", phone: "+992 55 100 2200", address: "Душанбе, р. Шохмансур" },
    { name: "Гуломова Ф.", phone: "+992 97 440 8890", address: "Кулоб" },
    { name: "ООО «Бунёд Сервис»", phone: "+992 37 250 3311", address: "пр. И. Сомони 88" },
    { name: "Алиев Т.", phone: "+992 88 900 1122", address: "Душанбе" },
    { name: "«Фасад-2020»", phone: "+992 90 770 4455", address: "Варзоб" },
  ];

  const customers = [];
  for (let i = 0; i < customerDefs.length; i++) {
    const row = customerDefs[i];
    customers.push(
      await prisma.customer.create({
        data: {
          ...row,
          source: "seed",
          managerId: sales.id,
          comment: "Тестовый клиент — демо-данные цеха",
          createdAt: monthsAgo(3, 2 + (i % 20)),
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
    { monthAgo: 3, day: 4, customer: 0, kind: "tile", qty: 48, status: "COMPLETED", pay: "paid" },
    { monthAgo: 3, day: 9, customer: 1, kind: "stone", qty: 22, status: "ISSUED", pay: "paid" },
    { monthAgo: 3, day: 14, customer: 2, kind: "tile", qty: 80, status: "COMPLETED", pay: "paid" },
    { monthAgo: 3, day: 21, customer: 3, kind: "tile", qty: 36, status: "COMPLETED", pay: "paid" },
    { monthAgo: 3, day: 27, customer: 4, kind: "stone", qty: 18, status: "ISSUED", pay: "paid" },
    { monthAgo: 2, day: 3, customer: 5, kind: "tile", qty: 60, status: "COMPLETED", pay: "paid" },
    { monthAgo: 2, day: 8, customer: 6, kind: "tile", qty: 28, status: "COMPLETED", pay: "paid" },
    { monthAgo: 2, day: 13, customer: 7, kind: "stone", qty: 40, status: "ISSUED", pay: "paid" },
    { monthAgo: 2, day: 19, customer: 8, kind: "tile", qty: 52, status: "COMPLETED", pay: "paid" },
    { monthAgo: 2, day: 25, customer: 9, kind: "tile", qty: 24, status: "COMPLETED", pay: "paid" },
    { monthAgo: 1, day: 2, customer: 10, kind: "stone", qty: 30, status: "COMPLETED", pay: "paid" },
    { monthAgo: 1, day: 7, customer: 11, kind: "tile", qty: 90, status: "COMPLETED", pay: "paid" },
    { monthAgo: 1, day: 12, customer: 12, kind: "tile", qty: 16, status: "ISSUED", pay: "paid" },
    { monthAgo: 1, day: 18, customer: 13, kind: "tile", qty: 44, status: "COMPLETED", pay: "paid" },
    { monthAgo: 1, day: 24, customer: 14, kind: "stone", qty: 26, status: "COMPLETED", pay: "paid" },
    { agoDays: 27, customer: 0, kind: "tile", qty: 70, status: "COMPLETED", pay: "paid" },
    { agoDays: 22, customer: 2, kind: "tile", qty: 32, status: "ISSUED", pay: "paid" },
    { agoDays: 18, customer: 5, kind: "stone", qty: 20, status: "COMPLETED", pay: "paid" },
    { agoDays: 15, customer: 8, kind: "tile", qty: 55, status: "COMPLETED", pay: "partial" },
    { agoDays: 11, customer: 10, kind: "tile", qty: 38, status: "ISSUED", pay: "paid" },
    { agoDays: 12, customer: 0, kind: "tile", qty: 42, status: "COMPLETED", pay: "paid" },
    { agoDays: 9, customer: 2, kind: "stone", qty: 18, status: "ISSUED", pay: "paid" },
    { agoDays: 6, customer: 5, kind: "tile", qty: 50, status: "READY", pay: "paid" },
    { agoDays: 4, customer: 1, kind: "tile", qty: 35, status: "IN_PRODUCTION", pay: "paid", overdue: true },
    { agoDays: 3, customer: 7, kind: "stone", qty: 24, status: "IN_PRODUCTION", pay: "partial" },
    { agoDays: 2, customer: 3, kind: "tile", qty: 20, status: "CONFIRMED", pay: "unpaid" },
    { agoDays: 1, customer: 8, kind: "tile", qty: 28, status: "NEW", pay: "unpaid" },
    { agoDays: 0, customer: 14, kind: "tile", qty: 45, status: "NEW", pay: "unpaid" },
    { agoDays: 0, customer: 11, kind: "stone", qty: 12, status: "CONFIRMED", pay: "partial" },
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
          method: draft.pay === "partial" && bank ? "bank" : "cash",
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
      const account = payment.method === "bank" && bank ? bank.id : cash.id;
      const ledgers = [
        { type: "CASH_IN", amount: paid, accountId: account, fundId: null as string | null, comment: "Оплата клиента", key: "cash" },
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
            producedAt: produced >= draft.qty ? daysAgo(Math.max(0, (draft.agoDays ?? 10) - 1)) : null,
            createdAt,
          },
        });
      }
    }
  }

  if (rent && power && fundId.OPEX) {
    for (let m = 3; m >= 0; m--) {
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
      createdAt: monthsAgo(3, 1),
    },
  });
  if (white && paint) {
    await prisma.supplierMaterial.createMany({
      data: [
        { supplierId: supplier.id, materialId: white.id },
        { supplierId: supplier.id, materialId: paint.id },
        ...(glue ? [{ supplierId: supplier.id, materialId: glue.id }] : []),
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
      { name: "ЧДММ «Суғд Фасад»", phone: SEED_LEAD_PHONES[0], stage: "CONTACTED", comment: "Хотят 120 м² плитки" },
      { name: "Назаров Д.", phone: SEED_LEAD_PHONES[1], stage: "CALC", comment: "Расчёт на камень" },
      { name: "ООО «Бунёд»", phone: SEED_LEAD_PHONES[2], stage: "OFFER", comment: "КП отправлено" },
      { name: "Шарифзода А.", phone: SEED_LEAD_PHONES[3], stage: "THINKING", comment: "Думает до пятницы" },
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

  if (rawWh && paint) {
    const paintStock = await prisma.stockItem.findFirst({
      where: { warehouseId: rawWh.id, materialId: paint.id },
    });
    if (paintStock) {
      await prisma.stockItem.update({
        where: { id: paintStock.id },
        data: { qtyOnHand: "12" },
      });
    }
    if (glue) {
      const glueStock = await prisma.stockItem.findFirst({
        where: { warehouseId: rawWh.id, materialId: glue.id },
      });
      if (glueStock) {
        await prisma.stockItem.update({
          where: { id: glueStock.id },
          data: { qtyOnHand: "18" },
        });
      }
    }
  }

  const openedAt = daysAgo(0, 8);
  await prisma.cashShift.create({
    data: {
      accountId: cash.id,
      openedById: owner.id,
      openingAmount: money(85000),
      status: "OPEN",
      comment: "seed",
      openedAt,
    },
  });

  const notifyUsers = [owner, sales, accountant].filter(Boolean) as Array<{ id: string }>;
  for (const user of notifyUsers) {
    await prisma.notification.create({
      data: {
        userId: user.id,
        type: "seed_low_stock",
        title: "Сырьё ниже минимума",
        body: "Краска: остаток 12 кг при минимуме 20 кг. Пора закупить.",
        createdAt: daysAgo(0, 9),
      },
    });
    await prisma.notification.create({
      data: {
        userId: user.id,
        type: "seed_overdue",
        title: "Просроченный заказ",
        body: "Заказ с просроченным сроком — проверьте раздел «Заказы».",
        createdAt: daysAgo(0, 10),
      },
    });
  }

  console.log(
    `Demo history seeded: ${customers.length} clients, ${drafts.length} orders, leads, purchases, open cash shift.`,
  );
}
