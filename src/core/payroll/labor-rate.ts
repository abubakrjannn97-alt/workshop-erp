import { D } from "@core/shared/decimal";

/** Default worker pay per 1 sale unit (м²) until per-product laborRate column exists in DB. */
export const DEFAULT_PRODUCT_LABOR_RATE = "22";

export function productLaborRate(stored?: { toString(): string } | string | null | undefined) {
  if (stored != null && D(String(stored)).gt(0)) return D(String(stored));
  return D(DEFAULT_PRODUCT_LABOR_RATE);
}
