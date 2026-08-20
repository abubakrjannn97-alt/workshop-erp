import type { PrismaClient } from "@prisma/client";
import { persistDomainSettings } from "../persist-domain-settings";
import { BAKERY_DOMAIN_CONFIG } from "../../../src/domains/bakery/config";

export type BakeryDomainSeedResult = {
  productionSchemeId: string;
};

/** Bakery Production domain settings + payroll scheme stub. Extend with catalog/opening stock. */
export async function seedBakeryDomain(prisma: PrismaClient): Promise<BakeryDomainSeedResult> {
  await persistDomainSettings(prisma, BAKERY_DOMAIN_CONFIG);

  const prodScheme = await prisma.payScheme.upsert({
    where: { code: BAKERY_DOMAIN_CONFIG.payroll.productionScheme },
    update: { name: "Производство, с/шт", kind: "PRODUCTION", productionRate: "0" },
    create: {
      code: BAKERY_DOMAIN_CONFIG.payroll.productionScheme,
      name: "Производство, с/шт",
      kind: "PRODUCTION",
      productionRate: "0",
    },
  });

  return { productionSchemeId: prodScheme.id };
}
