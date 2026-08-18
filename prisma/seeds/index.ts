import type { PrismaClient } from "@prisma/client";
import { seedCore } from "./core";
import { seedFacadeDomain } from "./domains/facade";
import { seedFacadeDemo } from "./demo/facade-history";

export async function seedWorkshopFacade(prisma: PrismaClient) {
  const { salesSchemeId } = await seedCore(prisma);
  const { productionSchemeId } = await seedFacadeDomain(prisma);
  await seedFacadeDemo(prisma, { productionSchemeId, salesSchemeId });
}

export { seedCore } from "./core";
export { seedFacadeDomain } from "./domains/facade";
export { seedFacadeDemo } from "./demo/facade-history";
