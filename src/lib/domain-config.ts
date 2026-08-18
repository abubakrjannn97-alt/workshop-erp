import { cache } from "react";
import { prisma } from "@/lib/prisma";
import { DOMAIN_SETTING_KEYS } from "@/lib/settings";
import { FACADE_DOMAIN_CONFIG } from "@/domains/facade/config";

export type DomainConfig = {
  domain: string;
  warehouses: {
    rawCode: string;
    fgCode: string;
  };
  payroll: {
    productionScheme: string;
  };
  product: {
    defaultSaleUnit: string;
    defaultOutputUnit: string;
    defaultCategory: string;
  };
};

function parseSettingValue(value: unknown): string {
  if (typeof value === "string") return value.replace(/^"|"$/g, "");
  if (value == null) return "";
  return String(value);
}

/** Standalone clone domain id — not used for multi-tenancy. */
export function getWorkshopDomain(): string {
  return process.env.WORKSHOP_DOMAIN?.trim() || FACADE_DOMAIN_CONFIG.domain;
}

/** Domain preset for the active WORKSHOP_DOMAIN (no runtime registry). */
export function getDomainPreset(): DomainConfig {
  const domain = getWorkshopDomain();
  if (domain === FACADE_DOMAIN_CONFIG.domain) {
    return {
      domain: FACADE_DOMAIN_CONFIG.domain,
      warehouses: { ...FACADE_DOMAIN_CONFIG.warehouses },
      payroll: { ...FACADE_DOMAIN_CONFIG.payroll },
      product: { ...FACADE_DOMAIN_CONFIG.product },
    };
  }
  throw new Error(`Unknown WORKSHOP_DOMAIN "${domain}". Supported: ${FACADE_DOMAIN_CONFIG.domain}.`);
}

export const getDomainConfig = cache(async (): Promise<DomainConfig> => {
  const preset = getDomainPreset();
  const keys = Object.values(DOMAIN_SETTING_KEYS);
  const rows = await prisma.setting.findMany({ where: { key: { in: keys } } });
  const byKey = new Map(rows.map((row) => [row.key, parseSettingValue(row.value)]));

  const pick = (key: string, fallback: string) => {
    const value = byKey.get(key)?.trim();
    return value ? value : fallback;
  };

  return {
    domain: pick(DOMAIN_SETTING_KEYS.workshopDomain, preset.domain),
    warehouses: {
      rawCode: pick(DOMAIN_SETTING_KEYS.warehouseRawCode, preset.warehouses.rawCode),
      fgCode: pick(DOMAIN_SETTING_KEYS.warehouseFgCode, preset.warehouses.fgCode),
    },
    payroll: {
      productionScheme: pick(
        DOMAIN_SETTING_KEYS.payrollProductionScheme,
        preset.payroll.productionScheme,
      ),
    },
    product: {
      defaultSaleUnit: pick(DOMAIN_SETTING_KEYS.productDefaultSaleUnit, preset.product.defaultSaleUnit),
      defaultOutputUnit: pick(
        DOMAIN_SETTING_KEYS.productDefaultOutputUnit,
        preset.product.defaultOutputUnit,
      ),
      defaultCategory: pick(DOMAIN_SETTING_KEYS.productDefaultCategory, preset.product.defaultCategory),
    },
  };
});

/** Phase 2 boundary — payroll hardcode removal follows in Phase 3. */
export async function resolveProductionPaySchemeCode(): Promise<string> {
  const config = await getDomainConfig();
  return config.payroll.productionScheme;
}
