import type { PrismaClient } from "@prisma/client";
import { DOMAIN_SETTING_KEYS } from "../../../src/core/config/settings";
import { BAKERY_DOMAIN_CONFIG } from "../../../src/domains/bakery/config";

export type BakeryDomainSeedResult = {
  productionSchemeId: string;
};

/** Bakery Production domain settings + payroll scheme stub. Extend with catalog/opening stock. */
export async function seedBakeryDomain(prisma: PrismaClient): Promise<BakeryDomainSeedResult> {
  const domainSettings: Record<string, string> = {
    [DOMAIN_SETTING_KEYS.workshopDomain]: BAKERY_DOMAIN_CONFIG.domain,
    [DOMAIN_SETTING_KEYS.warehouseRawCode]: BAKERY_DOMAIN_CONFIG.warehouses.rawCode,
    [DOMAIN_SETTING_KEYS.warehouseFgCode]: BAKERY_DOMAIN_CONFIG.warehouses.fgCode,
    [DOMAIN_SETTING_KEYS.payrollProductionScheme]: BAKERY_DOMAIN_CONFIG.payroll.productionScheme,
    [DOMAIN_SETTING_KEYS.productDefaultSaleUnit]: BAKERY_DOMAIN_CONFIG.product.defaultSaleUnit,
    [DOMAIN_SETTING_KEYS.productDefaultOutputUnit]: BAKERY_DOMAIN_CONFIG.product.defaultOutputUnit,
    [DOMAIN_SETTING_KEYS.productDefaultCategory]: BAKERY_DOMAIN_CONFIG.product.defaultCategory,
    [DOMAIN_SETTING_KEYS.productDefaultOutputPerBase]: String(
      BAKERY_DOMAIN_CONFIG.product.defaultOutputPerBase,
    ),
  };

  for (const [key, value] of Object.entries(domainSettings)) {
    await prisma.setting.upsert({
      where: { key },
      update: {},
      create: { key, value },
    });
  }

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
