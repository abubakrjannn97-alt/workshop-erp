"use client";

import { useState } from "react";
import { publishRecipeVersion } from "@/app/actions/recipes";
import { createT, type Locale } from "@core/shared/i18n/i18n";
import { AppSelect } from "@/components/app-select";

type Option = { id: string; name: string; extra?: string };

type Row = { materialId: string; quantity: string; unitId: string };

export function RecipeEditor({
  productId,
  materials,
  units,
  initial,
  locale,
}: {
  productId: string;
  materials: Option[];
  units: Option[];
  initial: Row[];
  locale: Locale;
}) {
  const t = createT(locale);
  const [rows, setRows] = useState<Row[]>(
    initial.length > 0 ? initial : [{ materialId: "", quantity: "", unitId: units[0]?.id ?? "" }],
  );
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function submit(formData: FormData) {
    setPending(true);
    setError(null);
    const result = await publishRecipeVersion(formData);
    setPending(false);
    if (result?.error) setError(result.error);
  }

  const materialOptions = [
    { value: "", label: t("common.material") },
    ...materials.map((m) => ({ value: m.id, label: m.name })),
  ];
  const unitOptions = units.map((u) => ({
    value: u.id,
    label: u.extra ?? u.name,
  }));

  return (
    <form action={submit} className="space-y-3">
      <input type="hidden" name="productId" value={productId} />
      {rows.map((row, index) => (
        <div key={index} className="grid gap-2 sm:grid-cols-3">
          <AppSelect
            name="materialId"
            value={row.materialId}
            onChange={(value) => {
              const next = [...rows];
              next[index] = { ...row, materialId: value };
              setRows(next);
            }}
            options={materialOptions}
            placeholder={t("common.material")}
          />
          <input
            name="quantity"
            value={row.quantity}
            onChange={(e) => {
              const next = [...rows];
              next[index] = { ...row, quantity: e.target.value };
              setRows(next);
            }}
            placeholder={t("common.qty")}
            className="ui-input"
          />
          <AppSelect
            name="unitId"
            value={row.unitId}
            onChange={(value) => {
              const next = [...rows];
              next[index] = { ...row, unitId: value };
              setRows(next);
            }}
            options={unitOptions}
          />
        </div>
      ))}
      <button
        type="button"
        onClick={() => setRows([...rows, { materialId: "", quantity: "", unitId: units[0]?.id ?? "" }])}
        className="text-sm text-[var(--titan-dark)]"
      >
        {t("recipe.addComponent")}
      </button>
      <input
        name="comment"
        placeholder={t("recipe.commentPhShort")}
        className="w-full ui-input"
      />
      {error ? <p className="text-sm text-[var(--danger)]">{error}</p> : null}
      <button type="submit" disabled={pending} className="ui-btn-primary disabled:opacity-60">
        {pending ? t("common.saving") : t("recipe.publishFull")}
      </button>
    </form>
  );
}
