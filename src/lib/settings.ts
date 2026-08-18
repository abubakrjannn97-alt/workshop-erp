export const SETTING_KEYS = {
  companyName: "company_name",
  logoUrl: "logo_url",
  currencyCode: "currency_code",
  currencyName: "currency_name",
  timezone: "timezone",
  discountLimitPercent: "discount_limit_percent",
  opexReservePercent: "opex_reserve_percent",
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
} as const;

export type DomainSettings = {
  workshopDomain: string;
  warehouseRawCode: string;
  warehouseFgCode: string;
  payrollProductionScheme: string;
  productDefaultSaleUnit: string;
  productDefaultOutputUnit: string;
  productDefaultCategory: string;
};

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
