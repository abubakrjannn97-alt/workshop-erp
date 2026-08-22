"use client";

import { useTransition } from "react";
import { updateCustomerStatus } from "@/app/actions/customers";
import {
  CUSTOMER_STATUSES,
  customerStatusLabel,
  customerStatusTone,
  type CustomerStatus,
} from "@core/crm/customer-status";
import { createT, type Locale } from "@core/shared/i18n/i18n";
import { StatusBadge } from "@/components/status-badge";
import styles from "@/app/(app)/crm/customers.module.css";

export function CustomerStatusPicker({
  customerId,
  status,
  locale,
  compact = false,
}: {
  customerId: string;
  status: CustomerStatus;
  locale: Locale;
  compact?: boolean;
}) {
  const t = createT(locale);
  const [pending, startTransition] = useTransition();

  function onChange(next: CustomerStatus) {
    if (next === status || pending) return;
    startTransition(async () => {
      const fd = new FormData();
      fd.set("id", customerId);
      fd.set("status", next);
      await updateCustomerStatus(fd);
    });
  }

  if (compact) {
    return (
      <select
        className={styles.statusSelect}
        value={status}
        disabled={pending}
        aria-label={t("crm.clientStatus")}
        onChange={(e) => onChange(e.target.value as CustomerStatus)}
      >
        {CUSTOMER_STATUSES.map((code) => (
          <option key={code} value={code}>
            {customerStatusLabel(code, t)}
          </option>
        ))}
      </select>
    );
  }

  return (
    <div className={styles.statusPicker} role="radiogroup" aria-label={t("crm.clientStatus")}>
      {CUSTOMER_STATUSES.map((code) => (
        <button
          key={code}
          type="button"
          role="radio"
          aria-checked={status === code}
          disabled={pending}
          className={`${styles.statusPill} ${status === code ? styles.statusPillActive : ""}`}
          onClick={() => onChange(code)}
        >
          <StatusBadge label={customerStatusLabel(code, t)} tone={customerStatusTone(code)} />
        </button>
      ))}
    </div>
  );
}
