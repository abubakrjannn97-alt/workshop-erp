"use client";

import Link from "next/link";
import {
  ORDER_LIST_SALE_BUCKETS,
  type OrderListSaleBucket,
} from "@core/shared/orders-list-filter";
import { buildOrdersQuery } from "@core/shared/order-period";
import styles from "./orders-status-picker.module.css";

export function OrdersStatusPicker({
  current,
  period,
  fromRaw,
  toRaw,
  q,
  allLabel,
  bucketLabels,
}: {
  current?: string;
  period: string;
  fromRaw?: string;
  toRaw?: string;
  q?: string;
  allLabel: string;
  bucketLabels: Record<OrderListSaleBucket, string>;
}) {
  function queryFor(status?: string) {
    return buildOrdersQuery({
      period: period === "custom" ? "custom" : period,
      from: fromRaw,
      to: toRaw,
      status,
      q,
      page: undefined,
    });
  }

  const activeBucket = current && current !== "all" ? current : undefined;

  return (
    <div className={styles.wrap} role="group" aria-label={allLabel}>
      <div className={styles.pills}>
        <Link
          href={`/orders${queryFor(undefined)}`}
          className={!activeBucket ? styles.pillActive : styles.pill}
          scroll={false}
        >
          {allLabel}
        </Link>
        {ORDER_LIST_SALE_BUCKETS.map((bucket) => {
          const active = activeBucket === bucket.code;
          return (
            <Link
              key={bucket.code}
              href={`/orders${queryFor(bucket.code)}`}
              className={active ? styles.pillActive : styles.pill}
              scroll={false}
            >
              {bucketLabels[bucket.code]}
            </Link>
          );
        })}
      </div>
    </div>
  );
}
