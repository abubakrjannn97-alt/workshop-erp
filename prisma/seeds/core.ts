import type { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import { DEMO_PASSWORD } from "../../src/core/auth/demo-users";
import { PERMISSIONS, ROLE_PERMISSIONS } from "../../src/core/rbac/permissions";
import { isValidPhone, normalizePhone } from "../../src/core/shared/phone";
import { ensureDefaultWorkshop, bootstrapWorkshopStructure } from "../../src/core/workshop/bootstrap-workshop";
import { DEFAULT_WORKSHOP_ID } from "../../src/core/workshop/workshop-context";

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

export function resolveSeedOwnerPassword() {
  const password = process.env.OWNER_PASSWORD ?? DEMO_PASSWORD;
  if (process.env.NODE_ENV === "production" && (!process.env.OWNER_PASSWORD || password === DEMO_PASSWORD)) {
    throw new Error("OWNER_PASSWORD must be explicitly set in production and must not use the demo default.");
  }
  return password;
}

/** Phone used for owner login (required in production). */
export function resolveSeedOwnerPhone() {
  const raw = process.env.OWNER_PHONE?.trim();
  if (raw) {
    if (!isValidPhone(raw)) {
      throw new Error("OWNER_PHONE is invalid.");
    }
    return normalizePhone(raw);
  }
  if (process.env.NODE_ENV === "production") {
    throw new Error("OWNER_PHONE must be explicitly set in production.");
  }
  return "900000001";
}

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

  await ensureDefaultWorkshop(prisma);
  await bootstrapWorkshopStructure(prisma, DEFAULT_WORKSHOP_ID);

  const ownerRole = await prisma.role.findUniqueOrThrow({ where: { code: "owner" } });
  const email = process.env.OWNER_EMAIL ?? "owner@workshop.local";
  const password = resolveSeedOwnerPassword();
  const phone = resolveSeedOwnerPhone();
  const passwordHash = await bcrypt.hash(password, 12);

  const owner = await prisma.user.upsert({
    where: { email },
    update: { passwordHash, roleId: ownerRole.id, phone },
    create: {
      email,
      name: "Владелец",
      phone,
      passwordHash,
      roleId: ownerRole.id,
    },
  });

  await prisma.userWorkshop.upsert({
    where: { userId_workshopId: { userId: owner.id, workshopId: DEFAULT_WORKSHOP_ID } },
    update: {},
    create: { userId: owner.id, workshopId: DEFAULT_WORKSHOP_ID },
  });

  const salesScheme = await prisma.payScheme.findUniqueOrThrow({
    where: { workshopId_code: { workshopId: DEFAULT_WORKSHOP_ID, code: "sales_commission" } },
  });
  return { salesSchemeId: salesScheme.id };
}
