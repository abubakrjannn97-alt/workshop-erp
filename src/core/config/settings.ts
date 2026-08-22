export const SETTING_KEYS = {
  companyName: "company_name",
  logoUrl: "logo_url",
  currencyCode: "currency_code",
  currencyName: "currency_name",
  timezone: "timezone",
  discountLimitPercent: "discount_limit_percent",
  opexReservePercent: "opex_reserve_percent",
  paymentCards: "payment_cards_json",
} as const;

/** Domain configuration keys (standalone clone, not multi-tenant). */
export const DOMAIN_SETTING_KEYS = {
  workshopDomain: "workshop_domain",
  warehouseRawCode: "warehouse.rawCode",
  warehouseFgCode: "warehouse.fgCode",
  payrollProductionScheme: "payroll.productionScheme",
  productDefaultSaleUnit: "product.defaultSaleUnit",
  productDefaultOutputUnit: "product.defaultOutputUnit",
  productDefaultCategory: "product.defaultCategory",
  productDefaultOutputPerBase: "product.defaultOutputPerBase",
} as const;

export type DomainSettings = {
  workshopDomain: string;
  warehouseRawCode: string;
  warehouseFgCode: string;
  payrollProductionScheme: string;
  productDefaultSaleUnit: string;
  productDefaultOutputUnit: string;
  productDefaultCategory: string;
  productDefaultOutputPerBase: string;
};

/** Preset shape used to persist / merge domain settings (no domain package imports). */
export type DomainSettingsSource = {
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

export function domainSettingsFromPreset(preset: DomainSettingsSource): Record<string, string> {
  return {
    [DOMAIN_SETTING_KEYS.workshopDomain]: preset.domain,
    [DOMAIN_SETTING_KEYS.warehouseRawCode]: preset.warehouses.rawCode,
    [DOMAIN_SETTING_KEYS.warehouseFgCode]: preset.warehouses.fgCode,
    [DOMAIN_SETTING_KEYS.payrollProductionScheme]: preset.payroll.productionScheme,
    [DOMAIN_SETTING_KEYS.productDefaultSaleUnit]: preset.product.defaultSaleUnit,
    [DOMAIN_SETTING_KEYS.productDefaultOutputUnit]: preset.product.defaultOutputUnit,
    [DOMAIN_SETTING_KEYS.productDefaultCategory]: preset.product.defaultCategory,
    [DOMAIN_SETTING_KEYS.productDefaultOutputPerBase]: String(preset.product.defaultOutputPerBase),
  };
}

export type BusinessSettings = {
  companyName: string;
  logoUrl: string;
  currencyCode: string;
  currencyName: string;
  timezone: string;
  discountLimitPercent: string;
  opexReservePercent: string;
};

export const CURRENCY_SYMBOL = "с";

export const DEFAULT_SETTINGS: BusinessSettings = {
  companyName: "Производственный цех",
  logoUrl: "",
  currencyCode: "TJS",
  currencyName: "сомони",
  timezone: "Asia/Dushanbe",
  discountLimitPercent: "5",
  opexReservePercent: "0",
};
