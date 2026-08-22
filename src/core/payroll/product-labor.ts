import { D, money } from "@core/shared/decimal";
import { productLaborRate } from "@core/payroll/labor-rate";

/** Labor cost from sale qty × each product's laborRate (с per м² / sale unit). */
export function laborAmountForLines(
  lines: { quantity: { toString(): string } | string; laborRate?: { toString(): string } | string | null | undefined }[],
): string {
  let total = D(0);
  for (const line of lines) {
    const rate = productLaborRate(line.laborRate);
    if (rate.lte(0)) continue;
    total = total.add(D(String(line.quantity)).mul(rate));
  }
  return money(total);
}
