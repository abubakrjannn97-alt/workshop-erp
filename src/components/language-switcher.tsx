"use client";

import { setLocaleAction } from "@/app/actions/locale";
import type { Locale } from "@/lib/i18n";

export function LanguageSwitcher({ locale }: { locale: Locale }) {
  return (
    <div className="inline-flex overflow-hidden rounded-[var(--radius-sm)] border border-[var(--line)] text-[11px] font-semibold">
      <form action={setLocaleAction}>
        <input type="hidden" name="locale" value="ru" />
        <button
          type="submit"
          className={`px-2 py-1 transition-colors ${
            locale === "ru"
              ? "bg-[var(--titan-dark)] text-white"
              : "bg-white text-[var(--text-secondary)] hover:bg-[var(--bg-secondary)]"
          }`}
          aria-pressed={locale === "ru"}
          title="Русский"
        >
          RU
        </button>
      </form>
      <form action={setLocaleAction}>
        <input type="hidden" name="locale" value="tj" />
        <button
          type="submit"
          className={`px-2 py-1 transition-colors ${
            locale === "tj"
              ? "bg-[var(--titan-dark)] text-white"
              : "bg-white text-[var(--text-secondary)] hover:bg-[var(--bg-secondary)]"
          }`}
          aria-pressed={locale === "tj"}
          title="Тоҷикӣ"
        >
          TJ
        </button>
      </form>
    </div>
  );
}
