import type { PrismaClient } from "@prisma/client";
import type { DomainRegistryEntry } from "../../src/domains/registry";

export type DemoSeedArgs = {
  productionSchemeId: string;
  salesSchemeId: string;
  forceHistory?: boolean;
};

export function domainHasDemo(entry: DomainRegistryEntry): boolean {
  return Boolean(entry.seed.demoModule && entry.seed.demoExport);
}

/**
 * Load optional demo/history from registry metadata.
 * Returns false when the domain has no demo package (valid for clones like bakery).
 */
export async function runRegistryDemo(
  prisma: PrismaClient,
  entry: DomainRegistryEntry,
  args: DemoSeedArgs,
): Promise<boolean> {
  if (!domainHasDemo(entry)) return false;
  const modulePath = entry.seed.demoModule!;
  const exportName = entry.seed.demoExport!;
  const mod = await import(`./${modulePath}`);
  const demoFn = (mod as Record<string, unknown>)[exportName];
  if (typeof demoFn !== "function") {
    throw new Error(`Demo export "${exportName}" not found in prisma/seeds/${modulePath}`);
  }
  await (demoFn as (client: PrismaClient, opts: DemoSeedArgs) => Promise<void>)(prisma, args);
  return true;
}
