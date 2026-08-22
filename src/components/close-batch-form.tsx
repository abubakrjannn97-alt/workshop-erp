"use client";

import { useId, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { closeBatch } from "@/app/actions/production";
import { qtyDisplay } from "@core/shared/decimal";
import type { Locale } from "@core/shared/i18n/i18n";
import { translate } from "@core/shared/i18n/i18n";
import { formDataToRecord } from "@/lib/offline/form";
import { enqueueAction } from "@/lib/offline/sync";
import { notifyOfflineQueueChanged } from "@/components/offline-sync";
import { FormField } from "@/components/form-field";

type BatchLine = {
  materialId: string;
  plannedQty: string;
  material: { name: string; storageUnit: { symbol: string } };
};

export function CloseBatchForm({
  batchId,
  plannedQty,
  materials,
  unit,
  locale,
  compact,
}: {
  batchId: string;
  plannedQty: string;
  materials: BatchLine[];
  unit: string;
  locale: Locale;
  compact?: boolean;
}) {
  const t = (key: string) => translate(locale, key);
  const router = useRouter();
  const idempotencyKey = useId().replace(/:/g, "");
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage(null);
    setError(null);

    const formData = new FormData(event.currentTarget);
    formData.set("idempotencyKey", `close-${batchId}-${idempotencyKey}`);

    if (!navigator.onLine) {
      startTransition(async () => {
        try {
          await enqueueAction({
            id: `close-${batchId}-${idempotencyKey}`,
            type: "production.closeBatch",
            payload: formDataToRecord(formData),
            label: t("prod.closeBatch"),
          });
          notifyOfflineQueueChanged();
          setMessage(t("offline.queued"));
        } catch {
          setError(t("offline.queueFailed"));
        }
      });
      return;
    }

    startTransition(async () => {
      const result = await closeBatch(formData);
      if (result.error) {
        setError(result.error);
        return;
      }
      setMessage(t("offline.saved"));
      router.refresh();
    });
  }

  return (
    <form onSubmit={handleSubmit} className="mt-3 space-y-3">
      <input type="hidden" name="batchId" value={batchId} />
      {!compact ? <p className="text-sm text-[var(--text-muted)]">{t("me.closeHint")}</p> : null}
      <FormField label={compact ? `${t("me.fgMadeQty")} (${unit})` : `${t("prod.actualGood")} (${unit})`}>
        <input
          name="actualQty"
          required
          inputMode="decimal"
          defaultValue={qtyDisplay(plannedQty)}
          className="ui-input"
        />
      </FormField>
      {!compact ? (
        <>
          <FormField label={`${t("common.scrap")} (${unit})`}>
            <input name="scrapQty" inputMode="decimal" defaultValue="0" className="ui-input" />
          </FormField>
          <FormField label={t("prod.scrapReason")}>
            <input name="scrapReason" className="ui-input" placeholder={t("prod.scrapReason")} />
          </FormField>
        </>
      ) : (
        <>
          <input type="hidden" name="scrapQty" value="0" />
          <input type="hidden" name="scrapReason" value="" />
        </>
      )}
      {materials.map((line) => (
        <input
          key={line.materialId}
          type="hidden"
          name={`actual-${line.materialId}`}
          value={qtyDisplay(line.plannedQty)}
        />
      ))}
      {error ? <p className="text-sm text-red-600">{error}</p> : null}
      {message ? <p className="text-sm text-[var(--color-gold-dark,#8B6914)]">{message}</p> : null}
      <button type="submit" disabled={pending} className="ui-btn-primary min-h-[44px] w-full" aria-busy={pending}>
        {pending ? t("common.sending") : compact ? t("me.fgAddShort") : t("prod.closeBatch")}
      </button>
    </form>
  );
}
