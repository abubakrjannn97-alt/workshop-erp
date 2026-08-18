import Decimal from "decimal.js";

Decimal.set({ precision: 28, rounding: Decimal.ROUND_HALF_UP });

export { Decimal };

type QtyIn = Decimal.Value | { toString(): string };

export function D(value: QtyIn) {
  return value instanceof Decimal ? new Decimal(value) : new Decimal(String(value));
}

export function money(value: QtyIn) {
  return D(value).toFixed(4);
}

export function qty(value: QtyIn) {
  return D(value).toFixed(6);
}

function trimTrailingZeros(value: string) {
  if (!value.includes(".")) return value;
  return value.replace(/\.?0+$/, "");
}

/** Money for screens: 55500.00 → "55500", 146.05 stays "146.05". */
export function moneyDisplay(value: QtyIn) {
  return trimTrailingZeros(D(value).toDecimalPlaces(2, Decimal.ROUND_HALF_UP).toFixed(2));
}

/** Quantity for screens: 380.000 → "380", 0.400 → "0.4". */
export function qtyDisplay(value: QtyIn) {
  return trimTrailingZeros(D(value).toDecimalPlaces(3, Decimal.ROUND_HALF_UP).toFixed(3));
}
