/**
 * Wipe all customers and non-owner employees for a clean manual test.
 * Keeps owner/director users and system reference data (roles, products, etc.).
 *
 * Usage:
 *   npx tsx scripts/wipe-customers-employees.ts
 *   # or with production env:
 *   dotenv -e .env.production.local -- npx tsx scripts/wipe-customers-employees.ts
 */
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function wipeOrders() {
  // Deepest dependents first
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

async function wipeEmployeesKeepOwners() {
  const keepRoles = await prisma.role.findMany({
    where: { code: { in: ["owner"] } },
    select: { id: true, code: true },
  });
  const keepRoleIds = keepRoles.map((r) => r.id);

  const keepUsers = await prisma.user.findMany({
    where: { roleId: { in: keepRoleIds } },
    select: { id: true, name: true, phone: true, email: true, role: { select: { code: true } } },
  });
  const keepIds = keepUsers.map((u) => u.id);

  // Clear FKs that point at users we may delete
  await prisma.customer.updateMany({ data: { managerId: null } });
  await prisma.lead.updateMany({ data: { managerId: null } });

  // Notifications / payroll / sessions cascade or need cleanup
  const toDelete = await prisma.user.findMany({
    where: keepIds.length ? { id: { notIn: keepIds } } : undefined,
    select: { id: true, name: true, phone: true, role: { select: { code: true } } },
  });

  if (toDelete.length === 0) {
    return { kept: keepUsers, deleted: [] as typeof toDelete };
  }

  const deleteIds = toDelete.map((u) => u.id);

  await prisma.notification.deleteMany({ where: { userId: { in: deleteIds } } });
  await prisma.payrollPayout.deleteMany({ where: { userId: { in: deleteIds } } });
  await prisma.payrollAccrual.deleteMany({ where: { userId: { in: deleteIds } } });
  await prisma.userPermission.deleteMany({ where: { userId: { in: deleteIds } } });
  await prisma.session.deleteMany({ where: { userId: { in: deleteIds } } });
  // audit_logs is append-only; FK is ON DELETE SET NULL — leave rows, clear user link via delete.

  // Batches may reference responsibleUserId without FK cascade — null them if column exists
  await prisma.productionBatch.updateMany({
    where: { responsibleUserId: { in: deleteIds } },
    data: { responsibleUserId: null },
  });

  // audit_logs is append-only; ON DELETE SET NULL would UPDATE rows and fail the trigger.
  await prisma.$executeRawUnsafe(`ALTER TABLE audit_logs DISABLE TRIGGER audit_logs_immutable`);
  try {
    await prisma.user.deleteMany({ where: { id: { in: deleteIds } } });
  } finally {
    await prisma.$executeRawUnsafe(`ALTER TABLE audit_logs ENABLE TRIGGER audit_logs_immutable`);
  }

  return { kept: keepUsers, deleted: toDelete };
}

async function main() {
  const dbUrl = process.env.DATABASE_URL ?? "";
  const hostMatch = dbUrl.match(/@([^/:]+)/);
  console.log(`Target DB host: ${hostMatch?.[1] ?? "(unknown)"}`);

  const beforeCustomers = await prisma.customer.count();
  const beforeUsers = await prisma.user.count();

  console.log(`Before: customers=${beforeCustomers}, users=${beforeUsers}`);

  console.log("Wiping orders / production linked to customers...");
  await wipeOrders();

  console.log("Wiping CRM (leads, documents, customers)...");
  await wipeCrm();

  console.log("Wiping employees (keeping owner only)...");
  const { kept, deleted } = await wipeEmployeesKeepOwners();

  const afterCustomers = await prisma.customer.count();
  const afterUsers = await prisma.user.count();

  console.log(`After: customers=${afterCustomers}, users=${afterUsers}`);
  console.log(
    "Kept owners:",
    kept.map((u) => `${u.name} (${u.role.code}, ${u.phone ?? u.email})`).join("; ") || "(none)",
  );
  console.log(
    "Deleted employees:",
    deleted.map((u) => `${u.name} (${u.role.code})`).join("; ") || "(none)",
  );
}

main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
