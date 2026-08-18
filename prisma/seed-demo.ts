import { createSeedClient } from "./seeds/client";
import { resolveSeedDomainId } from "./seeds/orchestrator";
import { getDomainRegistryEntry } from "../src/domains/registry";

const prisma = createSeedClient();

async function main() {
  const domainId = resolveSeedDomainId();
  const entry = getDomainRegistryEntry(domainId);
  if (!entry?.seed.demoModule || !entry.seed.demoExport) {
    throw new Error(`Demo seed is not configured for WORKSHOP_DOMAIN="${domainId}".`);
  }

  const [productionScheme, salesScheme] = await Promise.all([
    prisma.payScheme.findUnique({
      where: { code: entry.preset.payroll.productionScheme },
    }),
    prisma.payScheme.findUnique({ where: { code: "sales_commission" } }),
  ]);

  if (!productionScheme || !salesScheme) {
    throw new Error(
      `Demo seed requires core + ${domainId} domain seed first (production scheme and sales_commission).`,
    );
  }

  const mod = await import(`./seeds/${entry.seed.demoModule}`);
  const demoFn = (mod as Record<string, unknown>)[entry.seed.demoExport!];
  if (typeof demoFn !== "function") {
    throw new Error(`Demo export "${entry.seed.demoExport}" not found.`);
  }

  await (demoFn as (client: typeof prisma, opts: object) => Promise<void>)(prisma, {
    productionSchemeId: productionScheme.id,
    salesSchemeId: salesScheme.id,
    forceHistory: true,
  });
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (error) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });
