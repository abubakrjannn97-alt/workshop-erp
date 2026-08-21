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

const SNAPSHOT_KEY = "me-jobs";

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
  const [productId, setProductId] = useState(snapshot.fgStock?.[0]?.id ?? "");
  const [quantity, setQuantity] = useState("");

  useEffect(() => {
    idbPut("snapshots", SNAPSHOT_KEY, snapshot).catch(() => undefined);
    setData(snapshot);
    if (snapshot.fgStock?.length && !productId) {
      setProductId(snapshot.fgStock[0]!.id);
    }
  }, [snapshot, productId]);

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
      setQuantity("");
      router.refresh();
    });
  }

  return (
    <div className="page-stack">
      <PageHeader title={t("nav.myJobs")} description={t("me.workshopHint")} />
      {offline ? (
        <p className="rounded-lg border border-dashed border-[var(--line)] px-3 py-2 text-xs text-[var(--muted)]">
          {t("offline.cachedData")}
        </p>
      ) : null}

      <section className="ui-card p-4">
        <h2 className="text-sm font-semibold">{t("me.fgTitle")}</h2>
        <p className="mt-1 text-xs text-[var(--ink-2)]">{t("me.fgHint")}</p>
        {fgStock.length === 0 ? (
          <p className="mt-3 text-sm text-[var(--muted)]">{t("me.fgEmptyProducts")}</p>
        ) : (
          <ul className="mt-3 space-y-2">
            {fgStock.map((row) => (
              <li
                key={row.id}
                className={`rounded-lg border px-3 py-2 text-sm ${
                  row.low ? "border-[var(--bad,#B42318)]/30 bg-[rgba(180,35,24,0.04)]" : "border-[var(--line)]"
                }`}
              >
                <div className="flex items-baseline justify-between gap-2">
                  <span className="font-medium">{row.name}</span>
                  <span>
                    {row.onHand} {row.unit}
                  </span>
                </div>
                <p className="mt-0.5 text-xs text-[var(--ink-2)]">
                  {t("me.fgMin")}: {row.minStock} {row.unit}
                  {row.low && row.shortfall
                    ? ` · ${t("me.fgNeed")}: ${row.shortfall} ${row.unit}`
                    : ""}
                </p>
              </li>
            ))}
          </ul>
        )}

        {fgStock.length > 0 ? (
          <form action={onStockSubmit} className="mt-4 grid gap-2">
            <IdempotencyField prefix="fg-stock" />
            <label className="text-xs font-medium text-[var(--ink-2)]">
              {t("common.product")}
              <select
                name="productId"
                className="ui-input mt-1"
                value={productId}
                onChange={(e) => setProductId(e.target.value)}
              >
                {fgStock.map((row) => (
                  <option key={row.id} value={row.id}>
                    {row.name}
                    {row.low ? ` (${t("me.fgLow")})` : ""}
                  </option>
                ))}
              </select>
            </label>
            <label className="text-xs font-medium text-[var(--ink-2)]">
              {t("me.fgMadeQty")}
              <input
                name="quantity"
                required
                inputMode="decimal"
                className="ui-input mt-1"
                placeholder={lowItems[0]?.shortfall ?? "10"}
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
              />
            </label>
            <input type="hidden" name="comment" value="" />
            {error ? (
              <p className="text-sm text-[var(--bad,#B42318)]" role="alert">
                {error}
              </p>
            ) : null}
            <button type="submit" className="ui-btn-primary min-h-[44px]" disabled={pending}>
              {pending ? t("common.sending") : t("me.fgAddStock")}
            </button>
          </form>
        ) : null}
      </section>

      {!current ? (
        <section className="ui-card">
          <p className="text-sm text-[var(--muted)]">{t("me.noJobs")}</p>
        </section>
      ) : (
        <section className="ui-card p-4">
          <h2 className="text-sm font-semibold">{t("me.currentJob")}</h2>
          <p className="mt-1 text-sm font-medium">
            {current.productName} · {current.customerName}
          </p>
          <p className="mt-1 text-sm text-[var(--text-muted)]">
            {t("orders.plan")}: {current.jobPlannedQty} {current.unit}
            {" · "}
            {t("home.col.fact")}: {current.producedQty} / {current.plannedQty} {current.unit}
          </p>
          <div className="mt-3 h-2 overflow-hidden rounded-full bg-[var(--surface-muted)]">
            <div
              className="h-full rounded-full bg-[var(--color-gold)]"
              style={{ width: `${current.pct}%` }}
            />
          </div>
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
          />
          <Link
            href={`/production/${current.productionOrderId}`}
            className="mt-3 inline-block text-sm text-[var(--titan-dark)]"
          >
            {t("prod.openOrder")}
          </Link>
        </section>
      )}
      {data.jobs.length > 1 ? (
        <section className="ui-card">
          <h2 className="text-sm font-semibold">{t("dash.openJobs")}</h2>
          <ul className="mt-2 space-y-1 text-sm">
            {data.jobs.map((job) => (
              <li key={job.id}>
                <Link href={job.href} className="hover:underline">
                  {job.title}
                </Link>
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </div>
  );
}
