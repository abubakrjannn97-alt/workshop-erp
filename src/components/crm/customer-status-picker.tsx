"use client";

import { useState, useTransition } from "react";
import { updateCustomerStatus } from "@/app/actions/customers";
import {
  CUSTOMER_STATUSES,
  customerStatusLabel,
  customerStatusSelectClass,
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
  const [error, setError] = useState<string | null>(null);

  function onChange(next: CustomerStatus) {
    if (next === status || pending) return;
    setError(null);
    startTransition(async () => {
      const fd = new FormData();
      fd.set("id", customerId);
      fd.set("status", next);
      const result = await updateCustomerStatus(fd);
      if (result?.error) setError(result.error);
    });
  }

  if (compact) {
    return (
      <div className={styles.statusSelectWrap}>
        <select
          className={`${styles.statusSelect} ${styles[customerStatusSelectClass(status)]}`}
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
        {error ? <p className={styles.statusError}>{error}</p> : null}
      </div>
    );
  }

  return (
    <div className={styles.statusPickerBlock}>
      <div className={styles.statusPicker} role="radiogroup" aria-label={t("crm.clientStatus")}>
        {CUSTOMER_STATUSES.map((code) => (
          <button
            key={code}
            type="button"
            role="radio"
            aria-checked={status === code}
            disabled={pending}
            data-status={code}
            className={`${styles.statusPill} ${styles[`statusPill_${code}`]} ${
              status === code ? styles.statusPillActive : ""
            }`}
            onClick={() => onChange(code)}
          >
            <StatusBadge label={customerStatusLabel(code, t)} tone={customerStatusTone(code)} />
          </button>
        ))}
      </div>
      {error ? <p className={styles.statusError}>{error}</p> : null}
    </div>
  );
}
