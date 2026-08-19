/** URL bucket codes for the orders list (not always 1:1 with DB status codes). */
export const ORDER_LIST_BUCKET_NEW = "new" as const;
export const ORDER_LIST_BUCKET_DONE = "COMPLETED" as const;

export const ORDER_LIST_BUCKETS = [
  { code: ORDER_LIST_BUCKET_NEW, labelKey: "orders.bucketNew" },
  { code: ORDER_LIST_BUCKET_DONE, labelKey: "orders.bucketDone" },
] as const;

const NEW_ORDER_STATUS_CODES = ["NEW", "AWAITING_PAYMENT"] as const;

export function resolveOrderListBucket(status?: string) {
  return status === ORDER_LIST_BUCKET_DONE ? ORDER_LIST_BUCKET_DONE : ORDER_LIST_BUCKET_NEW;
}

export function orderListStatusWhere(status?: string) {
  const bucket = resolveOrderListBucket(status);
  if (bucket === ORDER_LIST_BUCKET_DONE) {
    return { status: { code: ORDER_LIST_BUCKET_DONE } };
  }
  return { status: { code: { in: [...NEW_ORDER_STATUS_CODES] } } };
}

export function newOrdersStatusWhere() {
  return { status: { code: { in: [...NEW_ORDER_STATUS_CODES] } } };
}

export function completedOrdersStatusWhere() {
  return { status: { code: ORDER_LIST_BUCKET_DONE } };
}
