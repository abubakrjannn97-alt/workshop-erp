import { cache } from "react";
import { prisma } from "@core/infrastructure/prisma";
import { DOMAIN_SETTING_KEYS } from "@core/config/settings";
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
    defaultOutputPerBase: number;
  };
};

function facadePreset(): DomainConfig {
  return {
    domain: FACADE_DOMAIN_CONFIG.domain,
    warehouses: { ...FACADE_DOMAIN_CONFIG.warehouses },
    payroll: { ...FACADE_DOMAIN_CONFIG.payroll },
    product: { ...FACADE_DOMAIN_CONFIG.product },
  };
}

/** Registered domain presets — add new domains here without changing lookup logic. */
const DOMAIN_PRESETS: Record<string, DomainConfig> = {
  [FACADE_DOMAIN_CONFIG.domain]: facadePreset(),
};

export const SUPPORTED_WORKSHOP_DOMAINS = Object.freeze(Object.keys(DOMAIN_PRESETS));

const DEFAULT_WORKSHOP_DOMAIN = FACADE_DOMAIN_CONFIG.domain;

function parseSettingValue(value: unknown): string {
  if (typeof value === "string") return value.replace(/^"|"$/g, "");
  if (value == null) return "";
  return String(value);
}

/** Standalone clone domain id — not used for multi-tenancy. */
export function getWorkshopDomain(): string {
  return process.env.WORKSHOP_DOMAIN?.trim() || DEFAULT_WORKSHOP_DOMAIN;
}

/** Domain preset for the active WORKSHOP_DOMAIN. */
export function getDomainPreset(): DomainConfig {
  const domain = getWorkshopDomain();
  const preset = DOMAIN_PRESETS[domain];
  if (!preset) {
    throw new Error(
      `Unknown WORKSHOP_DOMAIN "${domain}". Supported: ${SUPPORTED_WORKSHOP_DOMAINS.join(", ")}.`,
    );
  }
  return {
    domain: preset.domain,
    warehouses: { ...preset.warehouses },
    payroll: { ...preset.payroll },
    product: { ...preset.product },
  };
}

function parseSettingNumber(value: unknown, fallback: number): number {
  const raw = parseSettingValue(value).trim();
  if (!raw) return fallback;
  const parsed = Number(raw);
  return Number.isFinite(parsed) ? parsed : fallback;
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
      defaultOutputPerBase: parseSettingNumber(
        byKey.get(DOMAIN_SETTING_KEYS.productDefaultOutputPerBase),
        preset.product.defaultOutputPerBase,
      ),
    },
  };
});

export async function resolveProductionPaySchemeCode(): Promise<string> {
  const config = await getDomainConfig();
  return config.payroll.productionScheme;
}
