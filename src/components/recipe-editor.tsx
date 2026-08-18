"use client";

import { useState } from "react";
import { publishRecipeVersion } from "@/app/actions/recipes";
import { createT, type Locale } from "@core/shared/i18n/i18n";

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

  async function onSubmit(formData: FormData) {
    setPending(true);
    setError(null);
    const result = await publishRecipeVersion(formData);
    setPending(false);
    if (result?.error) setError(result.error);
  }

  return (
    <form action={onSubmit} className="space-y-3">
      <input type="hidden" name="productId" value={productId} />
      {rows.map((row, index) => (
        <div key={index} className="grid gap-2 sm:grid-cols-7">
          <select
            name="materialId"
            value={row.materialId}
            onChange={(e) =>
              setRows((prev) => prev.map((r, i) => (i === index ? { ...r, materialId: e.target.value } : r)))
            }
            className="sm:col-span-3 rounded-lg border border-[var(--border)] px-3 py-2 text-sm"
          >
            <option value="">{t("recipe.material")}</option>
            {materials.map((m) => (
              <option key={m.id} value={m.id}>
                {m.name}
              </option>
            ))}
          </select>
          <input
            name="quantity"
            value={row.quantity}
            onChange={(e) =>
              setRows((prev) => prev.map((r, i) => (i === index ? { ...r, quantity: e.target.value } : r)))
            }
            placeholder={t("recipe.qty")}
            className="sm:col-span-2 rounded-lg border border-[var(--border)] px-3 py-2 text-sm"
          />
          <select
            name="unitId"
            value={row.unitId}
            onChange={(e) =>
              setRows((prev) => prev.map((r, i) => (i === index ? { ...r, unitId: e.target.value } : r)))
            }
            className="rounded-lg border border-[var(--border)] px-3 py-2 text-sm"
          >
            {units.map((u) => (
              <option key={u.id} value={u.id}>
                {u.extra ? `${u.name} (${u.extra})` : u.name}
              </option>
            ))}
          </select>
          <button
            type="button"
            onClick={() => setRows((prev) => prev.filter((_, i) => i !== index))}
            className="text-sm text-[var(--danger)]"
          >
            {t("common.remove")}
          </button>
        </div>
      ))}
      <button
        type="button"
        onClick={() => setRows((prev) => [...prev, { materialId: "", quantity: "", unitId: units[0]?.id ?? "" }])}
        className="text-sm font-medium text-[var(--titan-dark)]"
      >
        {t("recipe.addComponent")}
      </button>
      <input
        name="comment"
        placeholder={t("recipe.commentPh")}
        className="w-full rounded-lg border border-[var(--border)] px-3 py-2 text-sm"
      />
      {error ? <p className="text-sm text-[var(--danger)]">{error}</p> : null}
      <button
        type="submit"
        disabled={pending}
        className="ui-btn-primary disabled:opacity-60"
      >
        {pending ? t("common.saving") : t("recipe.publish")}
      </button>
      <p className="text-xs text-[var(--muted)]">{t("recipe.hint")}</p>
    </form>
  );
}
