"use client";

import { useEffect, useState } from "react";
import { createT, type Locale } from "@core/shared/i18n/i18n";
import styles from "./catalog-form.module.css";

export function FirstVisitTips({
  storageKey,
  tips,
  locale,
}: {
  storageKey: string;
  tips: string[];
  locale: Locale;
}) {
  const t = createT(locale);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    try {
      if (!localStorage.getItem(storageKey)) setVisible(true);
    } catch {
      /* ignore */
    }
  }, [storageKey]);

  function dismiss() {
    try {
      localStorage.setItem(storageKey, "1");
    } catch {
      /* ignore */
    }
    setVisible(false);
  }

  if (!visible || tips.length === 0) return null;

  return (
    <div className={styles.tips}>
      <ul className={styles.tipsList}>
        {tips.map((tip) => (
          <li key={tip}>{tip}</li>
        ))}
      </ul>
      <button type="button" className={styles.tipsBtn} onClick={dismiss}>
        {t("common.gotIt")}
      </button>
    </div>
  );
}
