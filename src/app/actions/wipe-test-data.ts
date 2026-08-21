"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@core/infrastructure/prisma";
import { requireSession } from "@core/auth/authz";

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
 * Owner-only: delete all customers and non-owner/director employees.
 * Used to clear demo/test data before real testing.
 */
export async function wipeCustomersAndEmployees() {
  const session = await requireSession();
  if (session.user.roleCode !== "owner") {
    return { error: "Только владелец." };
  }

  await wipeOrders();
  await wipeCrm();

  const keepRoles = await prisma.role.findMany({
    where: { code: { in: ["owner"] } },
    select: { id: true },
  });
  const keepRoleIds = keepRoles.map((r) => r.id);
  const keepUsers = await prisma.user.findMany({
    where: { roleId: { in: keepRoleIds } },
    select: { id: true },
  });
  const keepIds = keepUsers.map((u) => u.id);

  await prisma.customer.updateMany({ data: { managerId: null } });
  await prisma.lead.updateMany({ data: { managerId: null } });

  const toDelete = await prisma.user.findMany({
    where: keepIds.length ? { id: { notIn: keepIds } } : undefined,
    select: { id: true },
  });
  if (toDelete.length === 0) {
    revalidatePath("/");
    revalidatePath("/crm");
    revalidatePath("/employees");
    revalidatePath("/orders");
    return { ok: true, deletedUsers: 0, deletedCustomers: true };
  }

  const deleteIds = toDelete.map((u) => u.id);
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

  revalidatePath("/");
  revalidatePath("/crm");
  revalidatePath("/employees");
  revalidatePath("/orders");
  revalidatePath("/settings");
  return { ok: true, deletedUsers: deleteIds.length, deletedCustomers: true };
}
