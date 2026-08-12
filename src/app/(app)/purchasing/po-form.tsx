"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createPurchaseOrder } from "@/app/actions/purchasing";

type Opt = { id: string; name: string; extra?: string };

export function PurchaseOrderForm({
  suppliers,
  materials,
}: {
  suppliers: Opt[];
  materials: Opt[];
}) {
  const router = useRouter();
  const [rows, setRows] = useState([{ materialId: materials[0]?.id ?? "", quantity: "", unitPrice: "" }]);
  const [error, setError] = useState<string | null>(null);

  async function submit(formData: FormData) {
    const result = await createPurchaseOrder(formData);
    if (result?.error) setError(result.error);
    else if (result?.id) router.push(`/purchasing/${result.id}`);
  }

  return (
    <form action={submit} className="space-y-3 rounded-2xl border border-[var(--line)] bg-white p-5">
      <select name="supplierId" className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm">
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
            className="rounded-lg border border-slate-200 px-3 py-2 text-sm"
          >
            {materials.map((m) => (
              <option key={m.id} value={m.id}>
                {m.name}
              </option>
            ))}
          </select>
          <input
            name="quantity"
            placeholder="Кол-во в ед. хранения"
            value={row.quantity}
            onChange={(e) => {
              const next = [...rows];
              next[i] = { ...row, quantity: e.target.value };
              setRows(next);
            }}
            className="rounded-lg border border-slate-200 px-3 py-2 text-sm"
          />
          <input
            name="unitPrice"
            placeholder="Цена за ед."
            value={row.unitPrice}
            onChange={(e) => {
              const next = [...rows];
              next[i] = { ...row, unitPrice: e.target.value };
              setRows(next);
            }}
            className="rounded-lg border border-slate-200 px-3 py-2 text-sm"
          />
        </div>
      ))}
      <button type="button" className="text-sm text-[var(--titan-dark)]" onClick={() => setRows([...rows, { materialId: materials[0]?.id ?? "", quantity: "", unitPrice: "" }])}>
        + позиция
      </button>
      <input name="comment" placeholder="Комментарий" className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm" />
      {error ? <p className="text-sm text-red-700">{error}</p> : null}
      <button className="rounded-lg bg-[var(--titan-dark)] px-4 py-2 text-sm text-white">Создать заявку</button>
    </form>
  );
}
