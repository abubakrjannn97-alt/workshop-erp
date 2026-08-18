import { D, qty } from "@core/shared/decimal";

/**
 * Finished-goods stock is always in the product **sale unit** (m² for facade tile).
 * `outputPerBase` / `recipeBaseQty` converts sale qty → packing/output qty (PCS).
 * Production planned/actual/scrap, FG receive, and issue-to-customer all use sale units.
 * `OrderItem.outputQty` is informational conversion only — never a warehouse quantity.
 */
export function saleToOutputQty(
  saleQty: { toString(): string } | string,
  outputPerBase: { toString(): string } | string,
  recipeBaseQty: { toString(): string } | string,
) {
  const base = D(String(recipeBaseQty));
  const sale = D(String(saleQty));
  const per = D(String(outputPerBase));
  if (base.lte(0)) return qty(sale.mul(per));
  return qty(sale.mul(per).div(base));
}

export function outputToSaleQty(
  outputQty: { toString(): string } | string,
  outputPerBase: { toString(): string } | string,
  recipeBaseQty: { toString(): string } | string,
) {
  const per = D(String(outputPerBase));
  const out = D(String(outputQty));
  const base = D(String(recipeBaseQty));
  if (per.lte(0)) return qty(out);
  return qty(out.mul(base).div(per));
}

/** Quantity to write off from FG warehouse when issuing an order line. */
export function finishedGoodsIssueQty(item: { quantity: { toString(): string } | string }) {
  return qty(item.quantity);
}
