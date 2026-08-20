/** Bakery Production domain defaults — configuration only, no business logic. */
export const BAKERY_DOMAIN_CONFIG = {
  domain: "bakery",
  warehouses: {
    rawCode: "RAW",
    fgCode: "FG",
  },
  payroll: {
    productionScheme: "production_pcs",
  },
  product: {
    defaultSaleUnit: "KG",
    defaultOutputUnit: "PCS",
    defaultCategory: "Выпечка",
    defaultOutputPerBase: 1,
  },
} as const;

export type BakeryDomainConfig = typeof BAKERY_DOMAIN_CONFIG;
