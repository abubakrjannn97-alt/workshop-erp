"use client";

import { useState } from "react";
import { publishRecipeVersion } from "@/app/actions/recipes";

type Option = { id: string; name: string; extra?: string };

type Row = { materialId: string; quantity: string; unitId: string };

export function RecipeEditor({
  productId,
  materials,
  units,
  initial,
}: {
  productId: string;
  materials: Option[];
  units: Option[];
  initial: Row[];
}) {
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

  return (
    <form action={submit} className="space-y-3">
      <input type="hidden" name="productId" value={productId} />
      {rows.map((row, index) => (
        <div key={index} className="grid gap-2 sm:grid-cols-3">
          <select
            name="materialId"
            value={row.materialId}
            onChange={(e) => {
              const next = [...rows];
              next[index] = { ...row, materialId: e.target.value };
              setRows(next);
            }}
            className="rounded-lg border border-slate-200 px-3 py-2 text-sm"
          >
            <option value="">Материал</option>
            {materials.map((m) => (
              <option key={m.id} value={m.id}>
                {m.name}
              </option>
            ))}
          </select>
          <input
            name="quantity"
            value={row.quantity}
            onChange={(e) => {
              const next = [...rows];
              next[index] = { ...row, quantity: e.target.value };
              setRows(next);
            }}
            placeholder="Кол-во"
            className="rounded-lg border border-slate-200 px-3 py-2 text-sm"
          />
          <select
            name="unitId"
            value={row.unitId}
            onChange={(e) => {
              const next = [...rows];
              next[index] = { ...row, unitId: e.target.value };
              setRows(next);
            }}
            className="rounded-lg border border-slate-200 px-3 py-2 text-sm"
          >
            {units.map((u) => (
              <option key={u.id} value={u.id}>
                {u.name}
                {u.extra ? ` (${u.extra})` : ""}
              </option>
            ))}
          </select>
        </div>
      ))}
      <button
        type="button"
        onClick={() => setRows([...rows, { materialId: "", quantity: "", unitId: units[0]?.id ?? "" }])}
        className="text-sm text-teal-800"
      >
        + компонент
      </button>
      <input
        name="comment"
        placeholder="Комментарий версии, необязательно"
        className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
      />
      {error ? <p className="text-sm text-red-700">{error}</p> : null}
      <button
        type="submit"
        disabled={pending}
        className="rounded-lg bg-teal-800 px-4 py-2 text-sm font-medium text-white disabled:opacity-60"
      >
        {pending ? "Сохранение…" : "Опубликовать новую версию рецептуры"}
      </button>
    </form>
  );
}
