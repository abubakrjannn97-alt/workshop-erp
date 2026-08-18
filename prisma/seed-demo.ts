import { createSeedClient } from "./seeds/client";
import { seedFacadeDemo } from "./seeds/demo/facade-history";
import { FACADE_DOMAIN_CONFIG } from "../src/domains/facade/config";

const prisma = createSeedClient();

async function main() {
  const [productionScheme, salesScheme] = await Promise.all([
    prisma.payScheme.findUnique({
      where: { code: FACADE_DOMAIN_CONFIG.payroll.productionScheme },
    }),
    prisma.payScheme.findUnique({ where: { code: "sales_commission" } }),
  ]);

  if (!productionScheme || !salesScheme) {
    throw new Error(
      "Demo seed requires core + facade domain seed first (production scheme and sales_commission).",
    );
  }

  await seedFacadeDemo(prisma, {
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
