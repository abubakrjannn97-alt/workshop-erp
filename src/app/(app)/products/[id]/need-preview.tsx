"use client";

import { useMemo, useState } from "react";
import { D, moneyDisplay, qtyDisplay } from "@/lib/decimal";

type Line = {
  materialName: string;
  quantity: string;
  unitSymbol: string;
  lineCost: string | null;
};

export function NeedPreview({
  lines,
  outputPerBase,
  outputSymbol,
  saleSymbol,
  recipeBaseQty,
}: {
  lines: Line[];
  outputPerBase: string;
  outputSymbol: string;
  saleSymbol: string;
  recipeBaseQty: string;
}) {
  const [orderQty, setOrderQty] = useState("50");
  const scale = useMemo(() => {
    try {
      const base = D(recipeBaseQty);
      if (base.lte(0)) return D(orderQty || "0");
      return D(orderQty || "0").div(base);
    } catch {
      return D(0);
    }
  }, [orderQty, recipeBaseQty]);

  const total = lines.reduce((sum, line) => {
    if (!line.lineCost) return sum;
    return sum.add(D(line.lineCost).mul(scale));
  }, D(0));

  return (
    <div className="rounded-2xl border border-[var(--line)] bg-white p-5">
      <h2 className="text-sm font-semibold">Потребность на заказ</h2>
      <p className="mt-1 text-xs text-slate-500">Расчёт из текущей версии рецептуры, без ручного пересчёта.</p>
      <label className="mt-3 block text-sm">
        Количество, {saleSymbol}
        <input
          value={orderQty}
          onChange={(e) => setOrderQty(e.target.value)}
          className="mt-1 w-40 rounded-lg border border-slate-200 px-3 py-2 text-sm"
        />
      </label>
      <p className="mt-2 text-sm text-slate-600">
        Готовых единиц: {qtyDisplay(D(outputPerBase).mul(scale))} {outputSymbol}
      </p>
      <ul className="mt-3 space-y-1 text-sm">
        {lines.map((line) => (
          <li key={line.materialName} className="flex justify-between gap-4">
            <span>
              {line.materialName}: {qtyDisplay(D(line.quantity).mul(scale))} {line.unitSymbol}
            </span>
            <span className="font-mono text-xs">
              {line.lineCost ? `${moneyDisplay(D(line.lineCost).mul(scale))} с` : "нет цены"}
            </span>
          </li>
        ))}
      </ul>
      <p className="mt-3 text-sm font-semibold">
        Материалы на заказ: {moneyDisplay(total)} с
      </p>
    </div>
  );
}
