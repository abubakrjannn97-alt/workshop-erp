import Decimal from "decimal.js";
import { D, money, qty } from "@core/shared/decimal";

type DecimalType = Decimal;
type QtyIn = string | number | bigint | Decimal | { toString(): string };

export type UnitRef = {
  id: string;
  code: string;
  symbol: string;
  category: string;
  toBaseFactor: QtyIn;
  baseUnitId: string | null;
};

export type MaterialRef = {
  id: string;
  name: string;
  packageWeight: QtyIn;
  packagePrice: QtyIn;
  storageUnit: UnitRef;
};

export type RecipeItemRef = {
  material: MaterialRef;
  quantity: QtyIn;
  unit: UnitRef;
};

export type CostLine = {
  materialId: string;
  materialName: string;
  quantity: string;
  unitSymbol: string;
  quantityInStorage: string;
  storageSymbol: string;
  unitPrice: string | null;
  lineCost: string | null;
  warning: string | null;
};

export type MaterialCostResult = {
  lines: CostLine[];
  total: string | null;
  missingPrices: boolean;
};

function n(value: QtyIn | { toString(): string }) {
  return D(String(value));
}

export function unitCost(packagePrice: QtyIn, packageWeight: QtyIn) {
  const weight = n(packageWeight);
  if (weight.lte(0)) return null;
  return n(packagePrice).div(weight);
}

export function convertToStorage(quantity: QtyIn, from: UnitRef, storage: UnitRef) {
  const fromBase = from.baseUnitId ?? from.id;
  const storageBase = storage.baseUnitId ?? storage.id;
  if (fromBase !== storageBase && from.category !== storage.category) {
    return { qty: null as DecimalType | null, warning: "Единицы нельзя привести к единице хранения." };
  }
  return {
    qty: n(quantity).mul(n(from.toBaseFactor)).div(n(storage.toBaseFactor)),
    warning: null as string | null,
  };
}

export function materialCostForRecipe(items: RecipeItemRef[], scale = 1): MaterialCostResult {
  const lines: CostLine[] = [];
  let total = D(0);
  let missingPrices = false;
  const factor = n(scale);

  for (const item of items) {
    const converted = convertToStorage(n(item.quantity).mul(factor), item.unit, item.material.storageUnit);
    const price = unitCost(item.material.packagePrice, item.material.packageWeight);
    let lineCost: DecimalType | null = null;
    let warning = converted.warning;

    if (!converted.qty) {
      missingPrices = true;
    } else if (!price || n(item.material.packagePrice).lte(0)) {
      missingPrices = true;
      warning = warning ?? "Нет закупочной цены — стоимость не рассчитана.";
    } else {
      lineCost = converted.qty.mul(price);
      total = total.add(lineCost);
    }

    lines.push({
      materialId: item.material.id,
      materialName: item.material.name,
      quantity: qty(n(item.quantity).mul(factor)),
      unitSymbol: item.unit.symbol,
      quantityInStorage: converted.qty ? qty(converted.qty) : "0",
      storageSymbol: item.material.storageUnit.symbol,
      unitPrice: price ? money(price) : null,
      lineCost: lineCost ? money(lineCost) : null,
      warning,
    });
  }

  return {
    lines,
    total: missingPrices ? null : money(total),
    missingPrices,
  };
}

export function scaleNeed(baseQty: QtyIn, orderQty: QtyIn) {
  const base = D(baseQty);
  if (base.lte(0)) return D(orderQty);
  return D(orderQty).div(base);
}
