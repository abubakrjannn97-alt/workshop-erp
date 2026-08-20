import type { PrismaClient } from "@prisma/client";
import {
  DEFAULT_WORKSHOP_DOMAIN,
  getDomainRegistryEntry,
  SUPPORTED_WORKSHOP_DOMAINS,
  type DomainRegistryEntry,
} from "../../src/domains/registry";
import { seedCore } from "./core";
import { runRegistryDemo, type DemoSeedArgs } from "./demo-loader";

export type SeedWorkshopOptions = {
  /** When true, run optional demo/history seed if configured for the domain. Default: SEED_DEMO !== "0". */
  includeDemo?: boolean;
  /** Override WORKSHOP_DOMAIN for this run. */
  domainId?: string;
};

export type SeedWorkshopResult = {
  domainId: string;
  salesSchemeId: string;
  productionSchemeId: string;
  demoSeeded: boolean;
};

type DomainSeedResult = {
  productionSchemeId: string;
};

/** Resolve WORKSHOP_DOMAIN for CLI seeds (mirrors runtime default). */
export function resolveSeedDomainId(override?: string): string {
  const fromEnv = override ?? process.env.WORKSHOP_DOMAIN?.trim();
  return fromEnv || DEFAULT_WORKSHOP_DOMAIN;
}

function shouldIncludeDemo(explicit?: boolean): boolean {
  if (explicit !== undefined) return explicit;
  return process.env.SEED_DEMO !== "0";
}

async function importSeedModule<T>(modulePath: string, exportName: string): Promise<T> {
  const mod = await import(`./${modulePath}`);
  const fn = (mod as Record<string, unknown>)[exportName];
  if (typeof fn !== "function") {
    throw new Error(`Seed export "${exportName}" not found in prisma/seeds/${modulePath}`);
  }
  return fn as T;
}

async function runDomainSeed(
  prisma: PrismaClient,
  entry: DomainRegistryEntry,
): Promise<DomainSeedResult> {
  const seedFn = await importSeedModule<
    (client: PrismaClient) => Promise<DomainSeedResult>
  >(entry.seed.seedModule, entry.seed.seedExport);
  return seedFn(prisma);
}

function requireRegistryEntry(domainId: string) {
  const entry = getDomainRegistryEntry(domainId);
  if (!entry) {
    throw new Error(
      `Unknown WORKSHOP_DOMAIN "${domainId}". Supported: ${SUPPORTED_WORKSHOP_DOMAINS.join(", ")}.`,
    );
  }
  return entry;
}

/** Core + domain package from WORKSHOP_DOMAIN (no demo). */
export async function seedDomainPackage(
  prisma: PrismaClient,
  options: SeedWorkshopOptions = {},
): Promise<SeedWorkshopResult> {
  const domainId = resolveSeedDomainId(options.domainId);
  const entry = requireRegistryEntry(domainId);
  await seedCore(prisma);
  const { productionSchemeId } = await runDomainSeed(prisma, entry);
  const salesScheme = await prisma.payScheme.findUniqueOrThrow({ where: { code: "sales_commission" } });
  return {
    domainId,
    salesSchemeId: salesScheme.id,
    productionSchemeId,
    demoSeeded: false,
  };
}

/** Domain module only — assumes core seed already applied. */
export async function seedDomainOnly(
  prisma: PrismaClient,
  options: SeedWorkshopOptions = {},
): Promise<DomainSeedResult & { domainId: string }> {
  const domainId = resolveSeedDomainId(options.domainId);
  const entry = requireRegistryEntry(domainId);
  const result = await runDomainSeed(prisma, entry);
  return { domainId, ...result };
}

/**
 * Full workshop seed: core → domain (WORKSHOP_DOMAIN) → optional demo.
 * Default entry for `prisma db seed`.
 */
export async function seedWorkshop(
  prisma: PrismaClient,
  options: SeedWorkshopOptions = {},
): Promise<SeedWorkshopResult> {
  const domainId = resolveSeedDomainId(options.domainId);
  const entry = requireRegistryEntry(domainId);
  const includeDemo = shouldIncludeDemo(options.includeDemo);

  const { salesSchemeId } = await seedCore(prisma);
  const { productionSchemeId } = await runDomainSeed(prisma, entry);

  let demoSeeded = false;
  if (includeDemo) {
    demoSeeded = await runRegistryDemo(prisma, entry, { productionSchemeId, salesSchemeId });
  }

  return { domainId, salesSchemeId, productionSchemeId, demoSeeded };
}

/** @deprecated Use seedWorkshop — kept for backward compatibility. */
export async function seedWorkshopFacade(prisma: PrismaClient) {
  return seedWorkshop(prisma, { domainId: "facade", includeDemo: true });
}
