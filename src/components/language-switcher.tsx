"use client";

import { usePathname } from "next/navigation";
import { createT, type Locale } from "@core/shared/i18n/i18n";
import styles from "./language-switcher.module.css";

function switchHref(locale: Locale, pathname: string) {
  const redirect = encodeURIComponent(pathname || "/");
  return `/api/locale?locale=${locale}&redirect=${redirect}`;
}

export function LanguageSwitcher({
  locale,
}: {
  locale: Locale;
  variant?: "light" | "dark";
}) {
  const pathname = usePathname();
  const t = createT(locale);

  function renderOption(code: Locale, label: string, title: string) {
    const active = locale === code;
    if (active) {
      return (
        <span className={`${styles.opt} ${styles.optOn}`} aria-current="true" title={title}>
          {label}
        </span>
      );
    }
    return (
      <a href={switchHref(code, pathname)} className={styles.opt} title={title}>
        {label}
      </a>
    );
  }

  return (
    <div data-tour="tour-lang" className={styles.group} role="group" aria-label={t("lang.switch")}>
      {renderOption("ru", "RU", t("lang.ru"))}
      {renderOption("tj", "TJ", t("lang.tj"))}
    </div>
  );
}
