"use client";

import { createT, type Locale } from "@/lib/i18n";
import { LOCALE_COOKIE } from "@/lib/locale-cookie";

function writeLocaleCookie(locale: Locale) {
  const maxAge = 60 * 60 * 24 * 365;
  const secure =
    typeof window !== "undefined" && window.location.protocol === "https:" ? ";Secure" : "";
  document.cookie = `${LOCALE_COOKIE}=${encodeURIComponent(locale)};path=/;max-age=${maxAge};SameSite=Lax${secure}`;
}

export function LanguageSwitcher({
  locale,
  variant = "light",
}: {
  locale: Locale;
  variant?: "light" | "dark";
}) {
  const t = createT(locale);
  const dark = variant === "dark";
  const btn =
    "min-w-[1.75rem] rounded-md px-1.5 py-1 text-[10px] font-semibold leading-none touch-manipulation select-none active:opacity-80";

  function pick(next: Locale) {
    if (next === locale) return;
    writeLocaleCookie(next);
    void fetch("/api/locale", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ locale: next }),
      credentials: "same-origin",
      keepalive: true,
    }).catch(() => undefined);
    window.location.reload();
  }

  return (
    <div
      data-tour="tour-lang"
      className={
        dark
          ? "relative z-30 inline-flex rounded-lg border border-[rgba(232,201,120,0.35)] bg-[rgba(18,16,12,0.55)] p-0.5"
          : "relative z-30 inline-flex rounded-lg border border-[var(--color-border)] bg-white p-px"
      }
      role="group"
      aria-label={t("lang.switch")}
    >
      <button
        type="button"
        onClick={() => pick("ru")}
        className={`${btn} ${
          locale === "ru"
            ? dark
              ? "bg-[#E8C978] text-[#14110D]"
              : "bg-[var(--color-sidebar)] text-[var(--color-gold)]"
            : dark
              ? "bg-transparent text-[rgba(247,244,238,0.55)]"
              : "bg-transparent text-[var(--color-text-muted)]"
        }`}
        aria-pressed={locale === "ru"}
        title={t("lang.ru")}
      >
        RU
      </button>
      <button
        type="button"
        onClick={() => pick("tj")}
        className={`${btn} ${
          locale === "tj"
            ? dark
              ? "bg-[#E8C978] text-[#14110D]"
              : "bg-[var(--color-sidebar)] text-[var(--color-gold)]"
            : dark
              ? "bg-transparent text-[rgba(247,244,238,0.55)]"
              : "bg-transparent text-[var(--color-text-muted)]"
        }`}
        aria-pressed={locale === "tj"}
        title={t("lang.tj")}
      >
        TJ
      </button>
    </div>
  );
}
