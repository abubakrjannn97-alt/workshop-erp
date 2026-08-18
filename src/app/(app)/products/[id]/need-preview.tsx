"use client";

import { useMemo, useState } from "react";
import { D, moneyDisplay, qtyDisplay } from "@core/shared/decimal";
import { createT, type Locale } from "@core/shared/i18n/i18n";

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
  locale,
}: {
  lines: Line[];
  outputPerBase: string;
  outputSymbol: string;
  saleSymbol: string;
  recipeBaseQty: string;
  locale: Locale;
}) {
  const t = createT(locale);
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
    <div className="ui-card">
      <h2 className="text-sm font-semibold">{t("products.needTitle")}</h2>
      <p className="mt-1 text-xs text-[var(--muted)]">{t("products.needHint")}</p>
      <label className="mt-3 block text-sm">
        {t("orders.qtyWithUnit")}, {saleSymbol}
        <input
          value={orderQty}
          onChange={(e) => setOrderQty(e.target.value)}
          className="mt-1 w-40 rounded-lg border border-[var(--border)] px-3 py-2 text-sm"
        />
      </label>
      <p className="mt-2 text-sm text-[var(--text-muted)]">
        {t("products.readyUnits")}: {qtyDisplay(D(outputPerBase).mul(scale))} {outputSymbol}
      </p>
      <ul className="mt-3 space-y-1 text-sm">
        {lines.map((line) => (
          <li key={line.materialName} className="flex justify-between gap-4">
            <span>
              {line.materialName}: {qtyDisplay(D(line.quantity).mul(scale))} {line.unitSymbol}
            </span>
            <span className="font-mono text-xs">
              {line.lineCost ? `${moneyDisplay(D(line.lineCost).mul(scale))} с` : t("products.noPrice")}
            </span>
          </li>
        ))}
      </ul>
      <p className="mt-3 text-sm font-semibold">
        {t("products.matsOnOrder")}: {moneyDisplay(total)} с
      </p>
    </div>
  );
}
