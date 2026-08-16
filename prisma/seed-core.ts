import { PrismaClient } from "@prisma/client";
import { PERMISSIONS, ROLE_PERMISSIONS } from "../src/lib/permissions";

const prisma = new PrismaClient();

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

async function main() {
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

  await prisma.warehouse.upsert({
    where: { code: "RAW" },
    update: { name: "Склад сырья", kind: "material" },
    create: { code: "RAW", name: "Склад сырья", kind: "material" },
  });
  await prisma.warehouse.upsert({
    where: { code: "FG" },
    update: { name: "Склад готовой продукции", kind: "finished" },
    create: { code: "FG", name: "Склад готовой продукции", kind: "finished" },
  });

  console.log("Core seed OK: permissions, roles (incl. employee), warehouses.");
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (error) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });
