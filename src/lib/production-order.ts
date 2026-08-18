type OrderItemProductRef = {
  productId: string;
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
