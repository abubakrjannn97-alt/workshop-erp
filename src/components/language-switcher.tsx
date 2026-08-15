"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { createT, type Locale } from "@/lib/i18n";
import { LOCALE_COOKIE } from "@/lib/locale";

function writeLocaleCookie(locale: Locale) {
  const maxAge = 60 * 60 * 24 * 365;
  document.cookie = `${LOCALE_COOKIE}=${encodeURIComponent(locale)};path=/;max-age=${maxAge};SameSite=Lax`;
}

export function LanguageSwitcher({
  locale,
  variant = "light",
}: {
  locale: Locale;
  variant?: "light" | "dark";
}) {
  const router = useRouter();
  const t = createT(locale);
  const [pending, setPending] = useState(false);
  const dark = variant === "dark";
  const btn =
    "min-w-[1.75rem] rounded-md px-1.5 py-1 text-[10px] font-semibold leading-none transition-[background,color] duration-150 touch-manipulation";

  useEffect(() => {
    setPending(false);
  }, [locale]);

  const pick = useCallback(
    async (next: Locale) => {
      if (next === locale || pending) return;
      setPending(true);
      writeLocaleCookie(next);

      try {
        await fetch("/api/locale", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ locale: next }),
          credentials: "same-origin",
          cache: "no-store",
        });
      } catch {
        /* cookie already set — refresh will still pick it up */
      }

      router.refresh();
    },
    [locale, pending, router],
  );

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
        onClick={() => void pick("ru")}
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
        onClick={() => void pick("tj")}
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
