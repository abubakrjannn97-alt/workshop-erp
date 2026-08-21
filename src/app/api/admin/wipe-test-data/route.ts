import { NextResponse } from "next/server";
import { prisma } from "@core/infrastructure/prisma";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

async function wipeOrders() {
  await prisma.scrapRecord.deleteMany({});
  await prisma.batchMaterialUse.deleteMany({});
  await prisma.productionBatch.deleteMany({});
  await prisma.productionOrder.deleteMany({});
  await prisma.payment.deleteMany({});
  await prisma.orderMaterialNeed.deleteMany({});
  await prisma.orderItem.deleteMany({});
  await prisma.order.deleteMany({});
}

async function wipeCrm() {
  await prisma.crmDocument.deleteMany({});
  await prisma.lead.deleteMany({});
  await prisma.customer.deleteMany({});
}

/**
 * One-shot admin wipe for production when CLI cannot reach secrets.
 * Requires header: x-wipe-token: <WIPE_TOKEN env>
 * If WIPE_TOKEN is unset, returns 404.
 */
export async function POST(req: Request) {
  const expected = process.env.WIPE_TOKEN?.trim();
  if (!expected) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }
  const token = req.headers.get("x-wipe-token")?.trim();
  if (!token || token !== expected) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const beforeCustomers = await prisma.customer.count();
  const beforeUsers = await prisma.user.count();

  await wipeOrders();
  await wipeCrm();

  const keepRoles = await prisma.role.findMany({
    where: { code: "owner" },
    select: { id: true },
  });
  const keepIds = (
    await prisma.user.findMany({
      where: { roleId: { in: keepRoles.map((r) => r.id) } },
      select: { id: true },
    })
  ).map((u) => u.id);

  await prisma.customer.updateMany({ data: { managerId: null } });
  await prisma.lead.updateMany({ data: { managerId: null } });

  const toDelete = await prisma.user.findMany({
    where: keepIds.length ? { id: { notIn: keepIds } } : undefined,
    select: { id: true },
  });
  const deleteIds = toDelete.map((u) => u.id);

  if (deleteIds.length) {
    await prisma.notification.deleteMany({ where: { userId: { in: deleteIds } } });
    await prisma.payrollPayout.deleteMany({ where: { userId: { in: deleteIds } } });
    await prisma.payrollAccrual.deleteMany({ where: { userId: { in: deleteIds } } });
    await prisma.userPermission.deleteMany({ where: { userId: { in: deleteIds } } });
    await prisma.session.deleteMany({ where: { userId: { in: deleteIds } } });
    await prisma.productionBatch.updateMany({
      where: { responsibleUserId: { in: deleteIds } },
      data: { responsibleUserId: null },
    });
    await prisma.$executeRawUnsafe(`ALTER TABLE audit_logs DISABLE TRIGGER audit_logs_immutable`);
    try {
      await prisma.user.deleteMany({ where: { id: { in: deleteIds } } });
    } finally {
      await prisma.$executeRawUnsafe(`ALTER TABLE audit_logs ENABLE TRIGGER audit_logs_immutable`);
    }
  }

  const afterCustomers = await prisma.customer.count();
  const afterUsers = await prisma.user.count();

  return NextResponse.json({
    ok: true,
    before: { customers: beforeCustomers, users: beforeUsers },
    after: { customers: afterCustomers, users: afterUsers },
    deletedUsers: deleteIds.length,
  });
}
