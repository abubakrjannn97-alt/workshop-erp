"use client";

import { useEffect, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { PageHeader } from "@/components/page-header";
import { CloseBatchForm } from "@/components/close-batch-form";
import { IdempotencyField } from "@/components/idempotency-field";
import { idbGet, idbPut } from "@/lib/offline/db";
import type { MeJobsSnapshot } from "@/lib/offline/types";
import type { Locale } from "@core/shared/i18n/i18n";
import { translate } from "@core/shared/i18n/i18n";
import { stockFinishedGoods } from "@/app/actions/fg-stock";
import styles from "./me-jobs-view.module.css";

const SNAPSHOT_KEY = "me-jobs";

function shortProductName(name: string) {
  const quoted = name.match(/[«"]([^»"]+)[»"]/);
  if (quoted?.[1]?.trim()) return quoted[1].trim();
  const cleaned = name.replace(/^(декоративный\s+камень|цоколь|плитка)\s*/i, "").trim();
  const base = cleaned || name.trim();
  return base.length > 24 ? `${base.slice(0, 22)}…` : base;
}

export function MeJobsView({
  snapshot,
  locale,
}: {
  snapshot: MeJobsSnapshot;
  locale: Locale;
}) {
  const t = (key: string) => translate(locale, key);
  const router = useRouter();
  const [data, setData] = useState(snapshot);
  const [offline, setOffline] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    idbPut("snapshots", SNAPSHOT_KEY, snapshot).catch(() => undefined);
    setData(snapshot);
  }, [snapshot]);

  useEffect(() => {
    const loadCached = async () => {
      const cached = await idbGet<MeJobsSnapshot>("snapshots", SNAPSHOT_KEY);
      if (cached) setData(cached);
      setOffline(true);
    };

    setOffline(!navigator.onLine);
    if (!navigator.onLine) loadCached();

    const onOffline = () => loadCached();
    const onOnline = () => {
      setOffline(false);
      setData(snapshot);
    };

    window.addEventListener("offline", onOffline);
    window.addEventListener("online", onOnline);
    return () => {
      window.removeEventListener("offline", onOffline);
      window.removeEventListener("online", onOnline);
    };
  }, [snapshot]);

  const current = data.current;
  const fgStock = data.fgStock ?? [];
  const lowItems = fgStock.filter((row) => row.low);

  function onStockSubmit(formData: FormData) {
    setError(null);
    startTransition(async () => {
      const result = await stockFinishedGoods(formData);
      if (result?.error) {
        setError(result.error);
        return;
      }
      router.refresh();
    });
  }

  return (
    <div className={styles.page}>
      <PageHeader title={t("me.dashboardTitle")} description={t("me.workshopHint")} />
      {offline ? <p className={styles.offline}>{t("offline.cachedData")}</p> : null}

      {fgStock.length === 0 ? (
        <p className={styles.allOk}>{t("me.fgEmptyProducts")}</p>
      ) : lowItems.length === 0 ? (
        <p className={styles.allOk}>{t("me.fgAllOk")}</p>
      ) : (
        <ul className={styles.needList}>
          {lowItems.map((row) => (
            <li key={row.id} className={styles.needCard}>
              <div className={styles.needHead}>
                <span className={styles.needName}>{shortProductName(row.name)}</span>
                <span className={styles.needStock}>
                  {row.onHand} {row.unit}
                </span>
              </div>
              <p className={styles.needGap}>
                {t("me.fgNeed")}: {row.shortfall} {row.unit}
              </p>
              <form action={onStockSubmit} className={styles.needForm}>
                <IdempotencyField prefix={`fg-${row.id}`} />
                <input type="hidden" name="productId" value={row.id} />
                <input type="hidden" name="comment" value="" />
                <input
                  name="quantity"
                  required
                  inputMode="decimal"
                  className="ui-input"
                  placeholder={row.shortfall ?? "10"}
                  aria-label={t("me.fgMadeQty")}
                />
                <button type="submit" className="ui-btn-primary" disabled={pending}>
                  {pending ? "…" : t("me.fgAddShort")}
                </button>
              </form>
            </li>
          ))}
        </ul>
      )}

      {error ? (
        <p className={styles.error} role="alert">
          {error}
        </p>
      ) : null}

      {current ? (
        <section className={styles.jobCard}>
          <h2 className={styles.jobTitle}>{t("me.currentJob")}</h2>
          <p className={styles.jobMeta}>
            {shortProductName(current.productName)} · {current.customerName}
          </p>
          <p className={styles.jobMeta}>
            {t("orders.plan")}: {current.jobPlannedQty} {current.unit}
          </p>
          <CloseBatchForm
            batchId={current.batchId}
            plannedQty={current.jobPlannedQty}
            materials={current.materials.map((line) => ({
              materialId: line.materialId,
              plannedQty: line.plannedQty,
              material: { name: line.name, storageUnit: { symbol: line.symbol } },
            }))}
            unit={current.unit}
            locale={locale}
            compact
          />
        </section>
      ) : null}

      <div className={styles.warehouseLink}>
        <Link href="/warehouse">{t("me.openWarehouse")}</Link>
      </div>
    </div>
  );
}
