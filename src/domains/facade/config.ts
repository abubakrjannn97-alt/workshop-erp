/** Facade Production domain defaults — configuration only, no business logic. */
export const FACADE_DOMAIN_CONFIG = {
  domain: "facade",
  warehouses: {
    rawCode: "RAW",
    fgCode: "FG",
  },
  payroll: {
    productionScheme: "production_m2",
  },
  product: {
    defaultSaleUnit: "M2",
    defaultOutputUnit: "PCS",
    defaultCategory: "Фасад",
  },
} as const;

export type FacadeDomainConfig = typeof FACADE_DOMAIN_CONFIG;
