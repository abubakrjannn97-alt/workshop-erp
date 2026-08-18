import type { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import { DEMO_USERS } from "../../src/lib/demo-users";
import { seedWorkshopHistory } from "../../seed-history";

type DemoSeedOptions = {
  forceHistory?: boolean;
};

/** Facade demo users and historical/demo business data. */
export async function seedFacadeDemo(
  prisma: PrismaClient,
  {
    productionSchemeId,
    salesSchemeId,
    forceHistory = false,
  }: {
    productionSchemeId: string;
    salesSchemeId: string;
    forceHistory?: boolean;
  },
) {
  const demoHash = await bcrypt.hash("ChangeMeNow!", 12);
  await seedDemoUsers(prisma, demoHash, productionSchemeId, salesSchemeId);
  await seedWorkshopHistory(prisma, forceHistory ? { force: true } : undefined);
}

async function seedDemoUsers(
  prisma: PrismaClient,
  passwordHash: string,
  productionSchemeId: string,
  salesSchemeId: string,
) {
  const roleCodes = DEMO_USERS.filter((u) => u.roleCode !== "owner").map((u) => u.roleCode);
  const roles = await prisma.role.findMany({ where: { code: { in: roleCodes } } });
  const byCode = Object.fromEntries(roles.map((r) => [r.code, r]));

  const paySchemeByRole: Partial<Record<string, string | null>> = {
    sales_manager: salesSchemeId,
    worker: productionSchemeId,
    production_manager: productionSchemeId,
  };

  for (const user of DEMO_USERS) {
    if (user.roleCode === "owner") continue;
    const role = byCode[user.roleCode];
    if (!role) continue;
    const paySchemeId = paySchemeByRole[user.roleCode] ?? null;
    await prisma.user.upsert({
      where: { email: user.email },
      update: { name: user.name, roleId: role.id, paySchemeId, passwordHash },
      create: {
        email: user.email,
        name: user.name,
        passwordHash,
        roleId: role.id,
        paySchemeId,
      },
    });
  }
}

export type { DemoSeedOptions };
