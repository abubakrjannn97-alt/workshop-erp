import { createSeedClient } from "./seeds/client";
import { resolveSeedDomainId } from "./seeds/orchestrator";
import { runRegistryDemo } from "./seeds/demo-loader";
import { getDomainRegistryEntry } from "../src/domains/registry";

const prisma = createSeedClient();

async function main() {
  const domainId = resolveSeedDomainId();
  const entry = getDomainRegistryEntry(domainId);
  if (!entry) {
    throw new Error(`Unknown WORKSHOP_DOMAIN="${domainId}".`);
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

  const seeded = await runRegistryDemo(prisma, entry, {
    productionSchemeId: productionScheme.id,
    salesSchemeId: salesScheme.id,
    forceHistory: true,
  });

  if (!seeded) {
    throw new Error(`Demo seed is not configured for WORKSHOP_DOMAIN="${domainId}".`);
  }
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
