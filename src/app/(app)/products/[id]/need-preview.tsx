"use client";

import { D, moneyDisplay, qtyDisplay } from "@core/shared/decimal";
import { createT, type Locale } from "@core/shared/i18n/i18n";
import styles from "./need-preview.module.css";

type Line = {
  materialName: string;
  quantity: string;
  unitSymbol: string;
  lineCost: string | null;
};

export function NeedPreview({
  lines,
  saleSymbol,
  recipeBaseQty,
  laborRate,
  locale,
  showCosts = true,
  hideTitle = false,
}: {
  lines: Line[];
  saleSymbol: string;
  recipeBaseQty: string;
  laborRate: string;
  locale: Locale;
  showCosts?: boolean;
  hideTitle?: boolean;
}) {
  const t = createT(locale);
  const base = (() => {
    try {
      const b = D(recipeBaseQty);
      return b.gt(0) ? b : D(1);
    } catch {
      return D(1);
    }
  })();
  /** Normalize recipe lines to 1 sale unit (м²). */
  const scale = D(1).div(base);
  const labor = (() => {
    try {
      return D(laborRate || "0");
    } catch {
      return D(0);
    }
  })();

  const materialsTotal = lines.reduce((sum, line) => {
    if (!line.lineCost) return sum;
    return sum.add(D(line.lineCost).mul(scale));
  }, D(0));
  const total = materialsTotal.add(labor);

  return (
    <div className={styles.box}>
      {hideTitle ? null : <p className={styles.title}>{t("products.costPerM2", { u: saleSymbol })}</p>}
      <ul className={styles.list}>
        {lines.map((line) => (
          <li key={line.materialName} className={styles.row}>
            <span>
              {line.materialName}: {qtyDisplay(D(line.quantity).mul(scale))} {line.unitSymbol}
            </span>
            {showCosts ? (
              <span className={styles.amount}>
                {line.lineCost ? `${moneyDisplay(D(line.lineCost).mul(scale))} с` : t("products.noPrice")}
              </span>
            ) : null}
          </li>
        ))}
        <li className={styles.row}>
          <span>{t("products.laborLine")}</span>
          {showCosts ? (
            <span className={styles.amount}>
              {labor.gt(0) ? `${moneyDisplay(labor)} с` : "—"}
            </span>
          ) : null}
        </li>
      </ul>
      {showCosts ? (
        <p className={styles.total}>
          {t("products.costPerM2Total")}: {moneyDisplay(total)} с
        </p>
      ) : null}
    </div>
  );
}
