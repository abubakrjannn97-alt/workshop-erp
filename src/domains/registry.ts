import type { Dict, Locale } from "@core/shared/i18n/i18n";
import { FACADE_DOMAIN_CONFIG } from "./facade/config";
import { FACADE_I18N_OVERRIDES } from "./facade/i18n-overrides";
import { FACADE_HELP_OVERRIDES } from "./facade/help-overrides";

/** Runtime domain preset — mirrors persisted DOMAIN_SETTING_KEYS. */
export type DomainPreset = {
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

export type DomainHelpOverrides = {
  tour?: Partial<Record<string, string>>;
  faq?: Partial<Record<string, string>>;
};

/** Seed wiring metadata for Phase 6.4 orchestrator (no seed logic here). */
export type DomainSeedMeta = {
  seedExport: string;
  seedModule: string;
  runScript: string;
  demoModule?: string;
  demoExport?: string;
};

export type DomainRegistryEntry = {
  id: string;
  label: string;
  preset: DomainPreset;
  i18n: Record<Locale, Dict>;
  help: Record<Locale, DomainHelpOverrides>;
  seed: DomainSeedMeta;
};

function facadePreset(): DomainPreset {
  return {
    domain: FACADE_DOMAIN_CONFIG.domain,
    warehouses: { ...FACADE_DOMAIN_CONFIG.warehouses },
    payroll: { ...FACADE_DOMAIN_CONFIG.payroll },
    product: { ...FACADE_DOMAIN_CONFIG.product },
  };
}

/**
 * Canonical registry of WORKSHOP_DOMAIN packages.
 * Add new clone domains here — not in domain-config.ts or i18n-domain.ts.
 */
export const DOMAIN_REGISTRY: Record<string, DomainRegistryEntry> = {
  [FACADE_DOMAIN_CONFIG.domain]: {
    id: FACADE_DOMAIN_CONFIG.domain,
    label: "Facade Production",
    preset: facadePreset(),
    i18n: FACADE_I18N_OVERRIDES,
    help: FACADE_HELP_OVERRIDES,
    seed: {
      seedExport: "seedFacadeDomain",
      seedModule: "domains/facade",
      runScript: "prisma/seeds/run-domain-facade.ts",
      demoModule: "demo/facade-history",
      demoExport: "seedFacadeDemo",
    },
  },
};

export const SUPPORTED_WORKSHOP_DOMAINS = Object.freeze(Object.keys(DOMAIN_REGISTRY));

export const DEFAULT_WORKSHOP_DOMAIN = FACADE_DOMAIN_CONFIG.domain;

export function getDomainRegistryEntry(domainId: string): DomainRegistryEntry | undefined {
  return DOMAIN_REGISTRY[domainId];
}

export function listDomainRegistryEntries(): DomainRegistryEntry[] {
  return Object.values(DOMAIN_REGISTRY);
}
