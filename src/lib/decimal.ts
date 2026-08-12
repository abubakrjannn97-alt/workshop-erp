import { Decimal } from "decimal.js";

Decimal.set({ precision: 28, rounding: Decimal.ROUND_HALF_UP });

export { Decimal };

export function D(value: Decimal.Value) {
  return new Decimal(value);
}

export function money(value: Decimal.Value) {
  return D(value).toFixed(4);
}

export function qty(value: Decimal.Value) {
  return D(value).toFixed(6);
}

export function moneyDisplay(value: Decimal.Value) {
  return D(value).toDecimalPlaces(2, Decimal.ROUND_HALF_UP).toFixed(2);
}

export function qtyDisplay(value: Decimal.Value) {
  return D(value).toDecimalPlaces(3, Decimal.ROUND_HALF_UP).toFixed(3);
}
