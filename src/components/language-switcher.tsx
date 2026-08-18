"use client";

import { usePathname } from "next/navigation";
import { createT, type Locale } from "@core/shared/i18n/i18n";

function switchHref(locale: Locale, pathname: string) {
  const redirect = encodeURIComponent(pathname || "/");
  return `/api/locale?locale=${locale}&redirect=${redirect}`;
}

export function LanguageSwitcher({
  locale,
  variant = "light",
}: {
  locale: Locale;
  variant?: "light" | "dark";
}) {
  const pathname = usePathname();
  const t = createT(locale);
  const dark = variant === "dark";
  const btn =
    "inline-flex min-w-[1.75rem] items-center justify-center rounded-md px-1.5 py-1 text-[10px] font-semibold leading-none touch-manipulation select-none no-underline active:opacity-80";

  function renderOption(code: Locale, label: string, title: string) {
    const active = locale === code;
    const tone = active
      ? dark
        ? "bg-[#E8C978] text-[#14110D]"
        : "bg-[var(--color-sidebar)] text-[var(--color-gold)]"
      : dark
        ? "bg-transparent text-[rgba(247,244,238,0.55)]"
        : "bg-transparent text-[var(--color-text-muted)]";

    if (active) {
      return (
        <span className={`${btn} ${tone}`} aria-current="true" title={title}>
          {label}
        </span>
      );
    }

    return (
      <a href={switchHref(code, pathname)} className={`${btn} ${tone}`} title={title}>
        {label}
      </a>
    );
  }

  return (
    <div
      data-tour="tour-lang"
      className={
        dark
          ? "relative z-[80] inline-flex rounded-lg border border-[rgba(232,201,120,0.35)] bg-[rgba(18,16,12,0.55)] p-0.5"
          : "relative z-[80] inline-flex rounded-lg border border-[var(--color-border)] bg-white p-px"
      }
      role="group"
      aria-label={t("lang.switch")}
    >
      {renderOption("ru", "RU", t("lang.ru"))}
      {renderOption("tj", "TJ", t("lang.tj"))}
    </div>
  );
}
