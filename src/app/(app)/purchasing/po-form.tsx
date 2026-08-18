"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createPurchaseOrder } from "@/app/actions/purchasing";
import { FormField } from "@/components/form-field";
import { PendingButton } from "@/components/pending-button";
import { createT, type Locale } from "@core/shared/i18n/i18n";

type Opt = { id: string; name: string; extra?: string };

export function PurchaseOrderForm({
  suppliers,
  materials,
  locale,
}: {
  suppliers: Opt[];
  materials: Opt[];
  locale: Locale;
}) {
  const t = createT(locale);
  const router = useRouter();
  const [rows, setRows] = useState([{ materialId: materials[0]?.id ?? "", quantity: "", unitPrice: "" }]);
  const [error, setError] = useState<string | null>(null);

  async function submit(formData: FormData) {
    const result = await createPurchaseOrder(formData);
    if (result?.error) setError(result.error);
    else if (result?.id) router.push(`/purchasing/${result.id}`);
  }

  return (
    <form action={submit} className="ui-card space-y-4 p-4" data-tour="po-new">
      <FormField label={t("common.supplier")} required>
        <select name="supplierId" className="ui-input" required defaultValue={suppliers[0]?.id}>
          {suppliers.map((s) => (
            <option key={s.id} value={s.id}>
              {s.name}
            </option>
          ))}
        </select>
      </FormField>

      <div className="space-y-3">
        {rows.map((row, i) => (
          <div key={i} className="grid gap-3 sm:grid-cols-3">
            <FormField label={i === 0 ? t("common.material") : `${t("common.material")} ${i + 1}`} required>
              <select
                name="materialId"
                value={row.materialId}
                onChange={(e) => {
                  const next = [...rows];
                  next[i] = { ...row, materialId: e.target.value };
                  setRows(next);
                }}
                className="ui-input"
                required
              >
                {materials.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.name}
                  </option>
                ))}
              </select>
            </FormField>
            <FormField label={i === 0 ? t("po.qtyStorage") : `${t("po.qtyStorage")} ${i + 1}`} required>
              <input
                name="quantity"
                value={row.quantity}
                onChange={(e) => {
                  const next = [...rows];
                  next[i] = { ...row, quantity: e.target.value };
                  setRows(next);
                }}
                className="ui-input"
                required
                inputMode="decimal"
              />
            </FormField>
            <FormField label={i === 0 ? t("common.unitPrice") : `${t("common.unitPrice")} ${i + 1}`} required>
              <input
                name="unitPrice"
                value={row.unitPrice}
                onChange={(e) => {
                  const next = [...rows];
                  next[i] = { ...row, unitPrice: e.target.value };
                  setRows(next);
                }}
                className="ui-input"
                required
                inputMode="decimal"
              />
            </FormField>
          </div>
        ))}
      </div>

      <button
        type="button"
        className="ui-btn-tertiary"
        onClick={() => setRows([...rows, { materialId: materials[0]?.id ?? "", quantity: "", unitPrice: "" }])}
      >
        {t("po.addLine")}
      </button>

      <FormField label={t("common.comment")}>
        <input name="comment" className="ui-input" />
      </FormField>

      {error ? (
        <p className="text-sm text-[var(--color-danger)]" role="alert">
          {error}
        </p>
      ) : null}

      <PendingButton className="ui-btn-primary w-full sm:w-auto" pendingLabel={t("common.saving")}>
        {t("po.createRequest")}
      </PendingButton>
    </form>
  );
}
