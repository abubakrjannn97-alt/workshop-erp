import { D, qty } from "@core/shared/decimal";

type OrderItemProductRef = {
  productId: string;
};

type OrderItemQtyRef = {
  productId: string;
  quantity: { toString(): string } | string;
};

export type BatchFinishedGoodsLine = {
  productId: string;
  quantity: string;
};

/**
 * ProductionOrder is one per sales order and posts finished goods for a single product.
 * Returns the product id when the order has one unique product; otherwise null.
 */
export function resolveProductionProductId(items: OrderItemProductRef[]): string | null {
  if (items.length === 0) return null;
  const productIds = [...new Set(items.map((item) => item.productId))];
  if (productIds.length === 1) return productIds[0];
  return null;
}

/**
 * Allocates batch actual sale-qty across all order products, proportional to each line's sale qty.
 * Mixed-product orders receive FG for every product (same unit as production: sale units).
 */
export function resolveBatchFinishedGoods(
  items: OrderItemQtyRef[],
  batchActualSaleQty: { toString(): string } | string,
  productionPlannedSaleQty: { toString(): string } | string,
): BatchFinishedGoodsLine[] {
  const actual = D(String(batchActualSaleQty));
  if (actual.lte(0) || items.length === 0) return [];

  const totals = new Map<string, ReturnType<typeof D>>();
  for (const item of items) {
    const prev = totals.get(item.productId) ?? D(0);
    totals.set(item.productId, prev.add(String(item.quantity)));
  }

  const planned = D(String(productionPlannedSaleQty));
  const denom = planned.gt(0)
    ? planned
    : [...totals.values()].reduce((s, n) => s.add(n), D(0));
  if (denom.lte(0)) return [];

  const lines: BatchFinishedGoodsLine[] = [];
  for (const [productId, orderQty] of totals) {
    const share = actual.mul(orderQty).div(denom);
    if (share.lte(0)) continue;
    lines.push({ productId, quantity: qty(share) });
  }
  return lines;
}
