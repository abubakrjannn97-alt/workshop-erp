import { closeBatch } from "@/app/actions/production";
import { qtyDisplay } from "@/lib/decimal";
import { IdempotencyField } from "@/components/idempotency-field";
import { PendingButton } from "@/components/pending-button";
import { FormField } from "@/components/form-field";

type BatchLine = {
  materialId: string;
  plannedQty: { toString(): string };
  material: { name: string; storageUnit: { symbol: string } };
};

export function CloseBatchForm({
  batchId,
  plannedQty,
  materials,
  unit,
  t,
}: {
  batchId: string;
  plannedQty: { toString(): string };
  materials: BatchLine[];
  unit: string;
  t: (k: string) => string;
}) {
  return (
    <form action={closeBatch} className="mt-3 space-y-3">
      <input type="hidden" name="batchId" value={batchId} />
      <IdempotencyField prefix={`close-${batchId}`} />
      <p className="text-sm text-[var(--text-muted)]">{t("me.closeHint")}</p>
      <FormField label={`${t("prod.actualGood")} (${unit})`}>
        <input
          name="actualQty"
          required
          inputMode="decimal"
          defaultValue={qtyDisplay(plannedQty)}
          className="ui-input"
        />
      </FormField>
      <FormField label={`${t("common.scrap")} (${unit})`}>
        <input name="scrapQty" inputMode="decimal" defaultValue="0" className="ui-input" />
      </FormField>
      <FormField label={t("prod.scrapReason")}>
        <input name="scrapReason" className="ui-input" placeholder={t("prod.scrapReason")} />
      </FormField>
      {materials.map((line) => (
        <input
          key={line.materialId}
          type="hidden"
          name={`actual-${line.materialId}`}
          value={qtyDisplay(line.plannedQty)}
        />
      ))}
      <PendingButton className="ui-btn-primary w-full" pendingLabel={t("common.sending")}>
        {t("prod.closeBatch")}
      </PendingButton>
    </form>
  );
}
