"use client";

import { useState, type ReactNode } from "react";
import { createT, type Locale } from "@core/shared/i18n/i18n";
import styles from "./analytics.module.css";

export function AnalyticsProductsSection({
  locale,
  children,
  count,
}: {
  locale: Locale;
  children: ReactNode;
  count: number;
}) {
  const t = createT(locale);
  const [open, setOpen] = useState(false);

  return (
    <section className={styles.card}>
      <div className={`${styles.cardHeadRow} ${styles.cardHeadGreen}`}>
        <h2 className={styles.cardTitle}>{t("an.byProduct")}</h2>
        {count > 0 ? (
          <button type="button" className={styles.cardToggle} onClick={() => setOpen((v) => !v)}>
            {open ? t("home.hide") : t("home.seeAll")}
          </button>
        ) : null}
      </div>
      {count === 0 ? (
        <p className={styles.empty}>{t("an.noSales")}</p>
      ) : open ? (
        children
      ) : (
        <p className={styles.collapsedHint}>{t("an.productsCollapsed", { n: String(count) })}</p>
      )}
    </section>
  );
}
