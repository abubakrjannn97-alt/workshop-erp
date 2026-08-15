"use client";

import { useTransition } from "react";
import { setLocaleAction } from "@/app/actions/locale";
import { createT, type Locale } from "@/lib/i18n";

export function LanguageSwitcher({
  locale,
  variant = "light",
}: {
  locale: Locale;
  variant?: "light" | "dark";
}) {
  const t = createT(locale);
  const [pending, start] = useTransition();
  const dark = variant === "dark";
  const btn =
    "min-w-[1.75rem] rounded-md px-1.5 py-1 text-[10px] font-semibold leading-none transition-[background,color] duration-150";

  function pick(next: Locale) {
    if (next === locale || pending) return;
    start(async () => {
      const fd = new FormData();
      fd.set("locale", next);
      await setLocaleAction(fd);
      window.location.reload();
    });
  }

  return (
    <div
      data-tour="tour-lang"
      className={
        dark
          ? "inline-flex rounded-lg border border-[rgba(232,201,120,0.35)] bg-[rgba(18,16,12,0.55)] p-0.5"
          : "inline-flex rounded-lg border border-[var(--color-border)] bg-white p-px"
      }
      role="group"
      aria-label={t("lang.switch")}
    >
      <button
        type="button"
        disabled={pending}
        onClick={() => pick("ru")}
        className={`${btn} ${
          locale === "ru"
            ? dark
              ? "bg-[#E8C978] text-[#14110D]"
              : "bg-[var(--color-sidebar)] text-[var(--color-gold)]"
            : dark
              ? "bg-transparent text-[rgba(247,244,238,0.55)] hover:text-white"
              : "bg-transparent text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)]"
        }`}
        aria-pressed={locale === "ru"}
        title={t("lang.ru")}
      >
        RU
      </button>
      <button
        type="button"
        disabled={pending}
        onClick={() => pick("tj")}
        className={`${btn} ${
          locale === "tj"
            ? dark
              ? "bg-[#E8C978] text-[#14110D]"
              : "bg-[var(--color-sidebar)] text-[var(--color-gold)]"
            : dark
              ? "bg-transparent text-[rgba(247,244,238,0.55)] hover:text-white"
              : "bg-transparent text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)]"
        }`}
        aria-pressed={locale === "tj"}
        title={t("lang.tj")}
      >
        TJ
      </button>
    </div>
  );
}
