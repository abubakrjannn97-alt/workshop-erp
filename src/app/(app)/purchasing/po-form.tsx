"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createPurchaseOrder } from "@/app/actions/purchasing";
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
    <form action={submit} className="space-y-3 ui-card" data-tour="po-new">
      <select name="supplierId" className="w-full rounded-lg border border-[var(--border)] px-3 py-2 text-sm">
        {suppliers.map((s) => (
          <option key={s.id} value={s.id}>
            {s.name}
          </option>
        ))}
      </select>
      {rows.map((row, i) => (
        <div key={i} className="grid gap-2 sm:grid-cols-3">
          <select
            name="materialId"
            value={row.materialId}
            onChange={(e) => {
              const next = [...rows];
              next[i] = { ...row, materialId: e.target.value };
              setRows(next);
            }}
            className="rounded-lg border border-[var(--border)] px-3 py-2 text-sm"
          >
            {materials.map((m) => (
              <option key={m.id} value={m.id}>
                {m.name}
              </option>
            ))}
          </select>
          <input
            name="quantity"
            placeholder={t("po.qtyStorage")}
            value={row.quantity}
            onChange={(e) => {
              const next = [...rows];
              next[i] = { ...row, quantity: e.target.value };
              setRows(next);
            }}
            className="rounded-lg border border-[var(--border)] px-3 py-2 text-sm"
          />
          <input
            name="unitPrice"
            placeholder={t("common.unitPrice")}
            value={row.unitPrice}
            onChange={(e) => {
              const next = [...rows];
              next[i] = { ...row, unitPrice: e.target.value };
              setRows(next);
            }}
            className="rounded-lg border border-[var(--border)] px-3 py-2 text-sm"
          />
        </div>
      ))}
      <button
        type="button"
        className="text-sm text-[var(--titan-dark)]"
        onClick={() => setRows([...rows, { materialId: materials[0]?.id ?? "", quantity: "", unitPrice: "" }])}
      >
        {t("po.addLine")}
      </button>
      <input
        name="comment"
        placeholder={t("common.comment")}
        className="w-full rounded-lg border border-[var(--border)] px-3 py-2 text-sm"
      />
      {error ? <p className="text-sm text-[var(--danger)]">{error}</p> : null}
      <button className="ui-btn-primary">{t("po.createRequest")}</button>
    </form>
  );
}
