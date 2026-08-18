import type { PrismaClient } from "@prisma/client";
import {
  seedDomainOnly,
  seedDomainPackage,
  seedWorkshop,
  seedWorkshopFacade,
} from "./orchestrator";

export {
  seedCore,
} from "./core";
export {
  seedFacadeDomain,
} from "./domains/facade";
export {
  seedFacadeDemo,
} from "./demo/facade-history";
export {
  resolveSeedDomainId,
  seedDomainOnly,
  seedDomainPackage,
  seedWorkshop,
  seedWorkshopFacade,
  type SeedWorkshopOptions,
  type SeedWorkshopResult,
} from "./orchestrator";

/** @deprecated Alias for seedWorkshopFacade */
export async function seedWorkshopFull(prisma: PrismaClient) {
  return seedWorkshop(prisma);
}
