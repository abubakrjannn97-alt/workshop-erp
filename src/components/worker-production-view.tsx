"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { ChevronDown } from "lucide-react";
import { ICON_STROKE } from "@/components/nav-icons";
import { IdempotencyField } from "@/components/idempotency-field";
import { stockFinishedGoods } from "@/app/actions/fg-stock";
import type { Locale } from "@core/shared/i18n/i18n";
import { translate } from "@core/shared/i18n/i18n";
import styles from "./worker-production-view.module.css";

export type WorkerProductRow = {
  id: string;
  name: string;
  unit: string;
  onHand: string;
};

export function WorkerProductionView({
  products,
  locale,
}: {
  products: WorkerProductRow[];
  locale: Locale;
}) {
  const t = (key: string) => translate(locale, key);
  const router = useRouter();
  const [openId, setOpenId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function onSubmit(formData: FormData) {
    setError(null);
    startTransition(async () => {
      const result = await stockFinishedGoods(formData);
      if (result?.error) {
        setError(result.error);
        return;
      }
      setOpenId(null);
      router.refresh();
    });
  }

  if (products.length === 0) {
    return <p className={styles.empty}>{t("me.fgEmptyProducts")}</p>;
  }

  return (
    <div className={styles.page}>
      <p className={styles.lead}>{t("me.workerProductionHint")}</p>
      <ul className={styles.list}>
        {products.map((row) => {
          const open = openId === row.id;
          return (
            <li key={row.id} className={`${styles.card} ${open ? styles.cardOpen : ""}`}>
              <button
                type="button"
                className={styles.cardHead}
                aria-expanded={open}
                onClick={() => setOpenId(open ? null : row.id)}
              >
                <div className={styles.cardMain}>
                  <p className={styles.cardName}>{row.name}</p>
                  <p className={styles.cardStock}>
                    {t("me.workerOnHand")}: {row.onHand} {row.unit}
                  </p>
                </div>
                <ChevronDown
                  size={18}
                  strokeWidth={ICON_STROKE}
                  className={`${styles.chevron} ${open ? styles.chevronOpen : ""}`}
                  aria-hidden
                />
              </button>
              {open ? (
                <form action={onSubmit} className={styles.form}>
                  <IdempotencyField prefix={`fg-${row.id}`} />
                  <input type="hidden" name="productId" value={row.id} />
                  <label className={styles.fieldLabel}>{t("me.workerMadeQty")}</label>
                  <input
                    name="quantity"
                    required
                    autoFocus
                    inputMode="decimal"
                    className="ui-input"
                    placeholder="0"
                  />
                  <button type="submit" className="ui-btn-primary min-h-[44px] w-full" disabled={pending}>
                    {pending ? t("common.sending") : t("me.workerSaveGp")}
                  </button>
                </form>
              ) : null}
            </li>
          );
        })}
      </ul>
      {error ? (
        <p className={styles.error} role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}
