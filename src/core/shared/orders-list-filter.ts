/** Optional status filter for the sales/orders list. */
export const ORDER_LIST_BUCKET_NEW = "new" as const;
export const ORDER_LIST_BUCKET_DONE = "COMPLETED" as const;

export const ORDER_LIST_BUCKETS = [
  { code: ORDER_LIST_BUCKET_NEW, labelKey: "orders.bucketNew" },
  { code: ORDER_LIST_BUCKET_DONE, labelKey: "orders.bucketDone" },
] as const;

const NEW_ORDER_STATUS_CODES = ["NEW", "AWAITING_PAYMENT"] as const;

/** Sales history statuses (quick sale lands on ISSUED). */
const SALE_HISTORY_STATUS_CODES = [
  "NEW",
  "AWAITING_PAYMENT",
  "CONFIRMED",
  "IN_PRODUCTION",
  "READY",
  "IN_FG",
  "ISSUED",
  "COMPLETED",
] as const;

export function resolveOrderListBucket(status?: string): string | undefined {
  if (!status || status === "all") return undefined;
  if (status === ORDER_LIST_BUCKET_DONE) return ORDER_LIST_BUCKET_DONE;
  if (status === ORDER_LIST_BUCKET_NEW) return ORDER_LIST_BUCKET_NEW;
  return status;
}

export function orderListStatusWhere(status?: string) {
  const bucket = resolveOrderListBucket(status);
  if (!bucket) {
    return {
      status: {
        code: { in: [...SALE_HISTORY_STATUS_CODES] },
      },
    };
  }
  if (bucket === ORDER_LIST_BUCKET_DONE) {
    return { status: { code: ORDER_LIST_BUCKET_DONE } };
  }
  if (bucket === ORDER_LIST_BUCKET_NEW) {
    return { status: { code: { in: [...NEW_ORDER_STATUS_CODES] } } };
  }
  return { status: { code: bucket } };
}

export function newOrdersStatusWhere() {
  return { status: { code: { in: [...NEW_ORDER_STATUS_CODES] } } };
}

export function completedOrdersStatusWhere() {
  return { status: { code: ORDER_LIST_BUCKET_DONE } };
}
