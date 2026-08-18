"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ChevronDown } from "lucide-react";
import type { Locale } from "@core/shared/i18n/i18n";
import { translate } from "@core/shared/i18n/i18n";
import {
  FINANCE_PERIODS,
  type FinancePeriod,
  financePeriodLabel,
} from "@core/shared/order-period";
import styles from "@/components/dashboards/mobile-owner-home.module.css";

export function FinancePeriodPicker({
  locale,
  current,
}: {
  locale: Locale;
  current: FinancePeriod;
}) {
  const t = (key: string) => translate(locale, key);
  const router = useRouter();
  const searchParams = useSearchParams();
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onPointer = (event: MouseEvent | TouchEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    };
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onPointer);
    document.addEventListener("touchstart", onPointer);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onPointer);
      document.removeEventListener("touchstart", onPointer);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  function selectPeriod(period: FinancePeriod) {
    setOpen(false);
    const params = new URLSearchParams(searchParams.toString());
    if (period === "month") params.delete("fp");
    else params.set("fp", period);
    const query = params.toString();
    router.replace(query ? `/?${query}` : "/", { scroll: false });
  }

  return (
    <div ref={rootRef} className={styles.periodWrap}>
      <button
        type="button"
        className={styles.period}
        aria-haspopup="listbox"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
      >
        {financePeriodLabel(current, t)}
        <ChevronDown size={14} strokeWidth={1.8} className={open ? styles.periodChevronOpen : undefined} />
      </button>
      {open ? (
        <ul className={styles.periodMenu} role="listbox" aria-label={t("home.periodPick")}>
          {FINANCE_PERIODS.map((period) => (
            <li key={period} role="option" aria-selected={period === current}>
              <button
                type="button"
                className={period === current ? styles.periodOptionActive : styles.periodOption}
                onClick={() => selectPeriod(period)}
              >
                {financePeriodLabel(period, t)}
              </button>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
