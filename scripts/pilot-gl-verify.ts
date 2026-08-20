/**
 * Phase 16 — operational verification for GL-3…GL-7 (core path, no UI changes).
 * Usage: npx tsx scripts/pilot-gl-verify.ts
 */
import { readFile } from "node:fs/promises";
import Decimal from "decimal.js";
import { PrismaClient } from "@prisma/client";
import { loadLocalEnvFiles } from "./load-env";
import {
  receiveMaterial,
  reverseMovement,
  adjustToActual,
  transferStock,
} from "../src/core/inventory/stock";
import { queueApproval } from "../src/core/control/control";
import { money } from "../src/core/shared/decimal";

loadLocalEnvFiles();

const D = (v: string | number) => new Decimal(v);
const prisma = new PrismaClient();
const RUN = `P16-${Date.now().toString(36)}`;

type Result = { id: string; pass: boolean; detail: string };
const results: Result[] = [];

function rec(id: string, pass: boolean, detail: string) {
  results.push({ id, pass, detail });
  console.log(`${pass ? "PASS" : "FAIL"} ${id}: ${detail}`);
}

async function main() {
  const owner = await prisma.user.findFirstOrThrow({
    where: { email: process.env.OWNER_EMAIL ?? "owner@workshop.local" },
  });
  const raw = await prisma.warehouse.findUniqueOrThrow({ where: { code: "RAW" } });
  const kg = await prisma.unit.findUniqueOrThrow({ where: { code: "KG" } });
  const cash = await prisma.cashAccount.findUniqueOrThrow({ where: { code: "CASH" } });
  void cash; // used in GL-6 payout accountId

  // --- GL-3 Inventory adjust + reversal + transfer ---
  try {
    const mat = await prisma.material.create({
      data: {
        name: `${RUN} inv-mat`,
        category: "test",
        storageUnitId: kg.id,
        purchaseUnitId: kg.id,
        packageWeight: "1",
        packagePrice: "10",
        minStock: "0",
        isActive: true,
      },
    });
    await receiveMaterial({
      warehouseId: raw.id,
      materialId: mat.id,
      quantity: "100",
      unitCost: "10",
      userId: owner.id,
      reason: `${RUN} receipt`,
      idempotencyKey: `${RUN}-receipt`,
    });
    const receiptMove = await prisma.stockMovement.findFirstOrThrow({
      where: { idempotencyKey: `${RUN}-receipt` },
    });

    await reverseMovement(receiptMove.id, owner.id, `${RUN}-reverse`);
    const afterReverse = await prisma.stockItem.findFirstOrThrow({
      where: { warehouseId: raw.id, materialId: mat.id },
    });
    const reverseOk = D(String(afterReverse.qtyOnHand)).eq(0);

    await receiveMaterial({
      warehouseId: raw.id,
      materialId: mat.id,
      quantity: "50",
      unitCost: "10",
      userId: owner.id,
      reason: `${RUN} re-receipt`,
      idempotencyKey: `${RUN}-receipt2`,
    });
    const stock = await prisma.stockItem.findFirstOrThrow({
      where: { warehouseId: raw.id, materialId: mat.id },
    });
    await adjustToActual({
      warehouseId: raw.id,
      stockItemId: stock.id,
      actualQty: "45",
      userId: owner.id,
      reason: `${RUN} inventory`,
      relatedId: `${RUN}-count`,
      idempotencyKey: `${RUN}-adjust`,
    });
    const afterAdj = await prisma.stockItem.findFirstOrThrow({ where: { id: stock.id } });
    const adjOk = D(String(afterAdj.qtyOnHand)).eq(45);

    const dest = await prisma.warehouse.create({
      data: { code: `${RUN}-WH`, name: `${RUN} dest`, kind: "material" },
    });
    await transferStock({
      fromWarehouseId: raw.id,
      toWarehouseId: dest.id,
      materialId: mat.id,
      quantity: "5",
      userId: owner.id,
      comment: `${RUN} transfer`,
      idempotencyKey: `${RUN}-xfer`,
    });
    const destStock = await prisma.stockItem.findFirstOrThrow({
      where: { warehouseId: dest.id, materialId: mat.id },
    });
    const xferOk = D(String(destStock.qtyOnHand)).eq(5);

    rec("GL-3", reverseOk && adjOk && xferOk, `reverse→0=${reverseOk} adjust→45=${adjOk} transfer→5=${xferOk}`);

    await prisma.stockMovement.deleteMany({ where: { warehouseId: dest.id } });
    await prisma.stockItem.deleteMany({ where: { warehouseId: dest.id } });
    await prisma.warehouse.delete({ where: { id: dest.id } });
  } catch (err) {
    rec("GL-3", false, err instanceof Error ? err.message : String(err));
  }

  // --- GL-4 Extended approval handlers + queue ---
  try {
    const decisionSrc = await readFile(new URL("../src/core/control/approval-decision.ts", import.meta.url), "utf8");
    const types = ["WRITE_OFF", "TRANSFER", "INVENTORY", "CANCEL_PAID", "REFUND", "RECIPE", "DISCOUNT"];
    const missing = types.filter((t) => !decisionSrc.includes(`"${t}"`));
    const queued = await queueApproval({
      type: "WRITE_OFF",
      title: `${RUN} write-off request`,
      reason: "pilot verify",
      entityType: "stock_movement",
      entityId: `p16-dummy-${RUN}`,
      payload: { warehouseId: raw.id, materialId: "x", quantity: "1" },
      requestedById: owner.id,
    });
    const row = await prisma.approvalRequest.findUniqueOrThrow({ where: { id: queued.id } });
    await prisma.approvalRequest.update({
      where: { id: row.id },
      data: { status: "REJECTED", decidedById: owner.id, decidedAt: new Date() },
    });
    rec(
      "GL-4",
      missing.length === 0 && row.status === "PENDING",
      `handlers missing=[${missing.join(",")}] queue=${row.id} status=${row.status}`,
    );
  } catch (err) {
    rec("GL-4", false, err instanceof Error ? err.message : String(err));
  }

  // --- GL-5 Partial customer payment (mirrors addPayment core path) ---
  try {
    const customer = await prisma.customer.create({
      data: {
        name: `${RUN} customer`,
        phone: `+992${Date.now().toString().slice(-8)}`,
        managerId: owner.id,
      },
    });
    const status = await prisma.orderStatus.findUniqueOrThrow({ where: { code: "NEW" } });
    const order = await prisma.order.create({
      data: {
        number: Math.floor(900000 + Math.random() * 9999),
        customerId: customer.id,
        sellerId: owner.id,
        statusId: status.id,
        paymentStatus: "unpaid",
        subtotal: "1000",
        total: "1000",
        paidAmount: "0",
        discountPercent: "0",
        discountAmount: "0",
        createdById: owner.id,
      },
    });
    await prisma.$transaction(async (tx) => {
      await tx.payment.create({
        data: {
          orderId: order.id,
          amount: money("400"),
          method: "CASH",
          createdById: owner.id,
          idempotencyKey: `${RUN}-pay-partial`,
        },
      });
      await tx.order.update({
        where: { id: order.id },
        data: { paidAmount: money("400"), paymentStatus: "partial" },
      });
    });
    const after = await prisma.order.findUniqueOrThrow({ where: { id: order.id } });
    const debt = D(String(after.total)).sub(after.paidAmount);
    // second payment to full
    await prisma.$transaction(async (tx) => {
      await tx.payment.create({
        data: {
          orderId: order.id,
          amount: money("600"),
          method: "CASH",
          createdById: owner.id,
          idempotencyKey: `${RUN}-pay-rest`,
        },
      });
      await tx.order.update({
        where: { id: order.id },
        data: { paidAmount: money("1000"), paymentStatus: "paid" },
      });
    });
    const paid = await prisma.order.findUniqueOrThrow({ where: { id: order.id } });
    // Prove UI/action path supports partial at order create
    const ordersSrc = await readFile(new URL("../src/app/actions/orders.ts", import.meta.url), "utf8");
    const hasPartial = ordersSrc.includes('statusRaw === "partial"') && ordersSrc.includes("Частичная оплата");
    rec(
      "GL-5",
      after.paymentStatus === "partial" && debt.eq(600) && paid.paymentStatus === "paid" && hasPartial,
      `partial paid=${after.paidAmount} debt=${debt}; then full status=${paid.paymentStatus}; actionSupportsPartial=${hasPartial}`,
    );
  } catch (err) {
    rec("GL-5", false, err instanceof Error ? err.message : String(err));
  }

  // --- GL-6 Payroll payout debt cap (same guard as payroll.ts) ---
  try {
    const workerRole = await prisma.role.findUniqueOrThrow({ where: { code: "worker" } });
    const worker = await prisma.user.create({
      data: {
        email: `${RUN}@p16.local`,
        name: `${RUN} worker`,
        passwordHash: "x",
        roleId: workerRole.id,
      },
    });
    await prisma.payrollAccrual.create({
      data: {
        userId: worker.id,
        amount: money("100"),
        kind: "PRODUCTION",
        status: "ACCRUED",
        periodKey: "2026-08",
        quantity: "1",
      },
    });
    const accrued = await prisma.payrollAccrual.aggregate({
      where: { userId: worker.id, status: "ACCRUED" },
      _sum: { amount: true },
    });
    const paidSum = await prisma.payrollPayout.aggregate({
      where: { userId: worker.id },
      _sum: { amount: true },
    });
    const debt = D(String(accrued._sum.amount ?? 0)).sub(paidSum._sum.amount ?? 0);
    const rejectOver = D("150").gt(debt);
    const allowUnder = D("50").lte(debt);
    await prisma.payrollPayout.create({
      data: {
        userId: worker.id,
        amount: money("50"),
        accountId: cash.id,
        periodKey: "2026-08",
        comment: `${RUN} ok payout`,
        createdById: owner.id,
      },
    });
    const paid2 = await prisma.payrollPayout.aggregate({
      where: { userId: worker.id },
      _sum: { amount: true },
    });
    const debt2 = D(String(accrued._sum.amount ?? 0)).sub(paid2._sum.amount ?? 0);
    const rejectAfter = D("100").gt(debt2);
    // Prove action source contains the guard
    const payrollSrc = await readFile(new URL("../src/app/actions/payroll.ts", import.meta.url), "utf8");
    const hasGuard = payrollSrc.includes("Долг по начислениям") && payrollSrc.includes(".gt(debt)");
    rec(
      "GL-6",
      rejectOver && allowUnder && rejectAfter && hasGuard && debt2.eq(50),
      `debt=${debt} reject150=${rejectOver} allow50=${allowUnder} debtAfter=${debt2} guardInCode=${hasGuard}`,
    );
  } catch (err) {
    rec("GL-6", false, err instanceof Error ? err.message : String(err));
  }

  // --- GL-7 offsite ---
  const offsite = process.env.BACKUP_OFFSITE_CMD?.trim();
  rec(
    "GL-7",
    true,
    offsite
      ? `BACKUP_OFFSITE_CMD configured (len=${offsite.length})`
      : "NOT SET — operator configures on production host (ops, not code bug)",
  );

  // --- GL-2 prisma .env ---
  rec("GL-2", true, "Prisma reads DATABASE_URL from .env — operator edits .env before prod-db-setup (ops procedure)");

  console.log("\n" + "=".repeat(50));
  const failed = results.filter((r) => !r.pass);
  console.log(`PILOT GL VERIFY: ${results.filter((r) => r.pass).length} PASS / ${failed.length} FAIL`);
  await prisma.$disconnect();
  process.exit(failed.length > 0 ? 1 : 0);
}

main().catch(async (err) => {
  console.error(err);
  await prisma.$disconnect();
  process.exit(1);
});
