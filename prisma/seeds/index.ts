import type { PrismaClient } from "@prisma/client";
import { seedWorkshop } from "./orchestrator";

export { seedCore } from "./core";
export {
  resolveSeedDomainId,
  seedDomainOnly,
  seedDomainPackage,
  seedWorkshop,
  seedWorkshopFacade,
  type SeedWorkshopOptions,
  type SeedWorkshopResult,
} from "./orchestrator";
export { persistDomainSettings } from "./persist-domain-settings";
export { domainHasDemo, runRegistryDemo } from "./demo-loader";

/** @deprecated Alias for seedWorkshop */
export async function seedWorkshopFull(prisma: PrismaClient) {
  return seedWorkshop(prisma);
}
