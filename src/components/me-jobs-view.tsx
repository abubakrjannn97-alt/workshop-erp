"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { PageHeader } from "@/components/page-header";
import { CloseBatchForm } from "@/components/close-batch-form";
import { idbGet, idbPut } from "@/lib/offline/db";
import type { MeJobsSnapshot } from "@/lib/offline/types";
import type { Locale } from "@/lib/i18n";
import { translate } from "@/lib/i18n";

const SNAPSHOT_KEY = "me-jobs";

export function MeJobsView({
  snapshot,
  locale,
}: {
  snapshot: MeJobsSnapshot;
  locale: Locale;
}) {
  const t = (key: string) => translate(locale, key);
  const [data, setData] = useState(snapshot);
  const [offline, setOffline] = useState(false);

  useEffect(() => {
    idbPut("snapshots", SNAPSHOT_KEY, snapshot).catch(() => undefined);
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

  return (
    <div className="page-stack">
      <PageHeader title={t("nav.myJobs")} description={t("me.closeHint")} />
      {offline ? (
        <p className="rounded-lg border border-dashed border-[var(--line)] px-3 py-2 text-xs text-[var(--muted)]">
          {t("offline.cachedData")}
        </p>
      ) : null}
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
