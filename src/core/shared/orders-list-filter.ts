/** Optional status filter for the sales/orders list. */
export const ORDER_LIST_BUCKET_NEW = "new" as const;
export const ORDER_LIST_BUCKET_DELIVERY = "delivery" as const;
export const ORDER_LIST_BUCKET_RECEIVED = "received" as const;
/** @deprecated use ORDER_LIST_BUCKET_RECEIVED */
export const ORDER_LIST_BUCKET_DONE = "COMPLETED" as const;

export const ORDER_LIST_SALE_BUCKETS = [
  { code: ORDER_LIST_BUCKET_NEW, labelKey: "orders.bucketNew" },
  { code: ORDER_LIST_BUCKET_DELIVERY, labelKey: "orders.bucketDelivery" },
  { code: ORDER_LIST_BUCKET_RECEIVED, labelKey: "orders.bucketReceived" },
] as const;

export type OrderListSaleBucket = (typeof ORDER_LIST_SALE_BUCKETS)[number]["code"];

const NEW_ORDER_STATUS_CODES = ["NEW", "AWAITING_PAYMENT"] as const;

const DELIVERY_STATUS_CODES = [
  "CONFIRMED",
  "SCHEDULED",
  "IN_PRODUCTION",
  "PARTIAL",
  "ON_HOLD",
  "READY",
  "IN_FG",
] as const;

const RECEIVED_STATUS_CODES = ["ISSUED", "COMPLETED"] as const;

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
  if (status === ORDER_LIST_BUCKET_NEW) return ORDER_LIST_BUCKET_NEW;
  if (status === ORDER_LIST_BUCKET_DELIVERY) return ORDER_LIST_BUCKET_DELIVERY;
  if (status === ORDER_LIST_BUCKET_RECEIVED) return ORDER_LIST_BUCKET_RECEIVED;
  if (status === ORDER_LIST_BUCKET_DONE) return ORDER_LIST_BUCKET_DONE;
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
  if (bucket === ORDER_LIST_BUCKET_NEW) {
    return { status: { code: { in: [...NEW_ORDER_STATUS_CODES] } } };
  }
  if (bucket === ORDER_LIST_BUCKET_DELIVERY) {
    return { status: { code: { in: [...DELIVERY_STATUS_CODES] } } };
  }
  if (bucket === ORDER_LIST_BUCKET_RECEIVED) {
    return { status: { code: { in: [...RECEIVED_STATUS_CODES] } } };
  }
  if (bucket === ORDER_LIST_BUCKET_DONE) {
    return { status: { code: ORDER_LIST_BUCKET_DONE } };
  }
  return { status: { code: bucket } };
}

export function newOrdersStatusWhere() {
  return { status: { code: { in: [...NEW_ORDER_STATUS_CODES] } } };
}

export function completedOrdersStatusWhere() {
  return { status: { code: { in: [...RECEIVED_STATUS_CODES] } } };
}
