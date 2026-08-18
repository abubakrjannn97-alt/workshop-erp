"use client";

import { useEffect, useRef, useState } from "react";
import { Search } from "lucide-react";
import type { Locale } from "@core/shared/i18n/i18n";
import { createT } from "@core/shared/i18n/i18n";

export function HeaderSearch({ locale }: { locale: Locale }) {
  const t = createT(locale);
  const [open, setOpen] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const wrapRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const id = window.requestAnimationFrame(() => inputRef.current?.focus());
    return () => window.cancelAnimationFrame(id);
  }, [open]);

  useEffect(() => {
    function onDoc(e: MouseEvent) {
      if (wrapRef.current?.contains(e.target as Node)) return;
      if (inputRef.current?.value) return;
      setOpen(false);
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") {
        setOpen(false);
        inputRef.current?.blur();
      }
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setOpen(true);
      }
    }
    document.addEventListener("mousedown", onDoc);
    window.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDoc);
      window.removeEventListener("keydown", onKey);
    };
  }, []);

  return (
    <div ref={wrapRef} className="relative w-full max-w-[360px]" data-tour="nav-search">
      <form
        action="/search"
        className="flex h-7 w-full items-center gap-1.5 rounded-lg border border-[#E5E7EB] bg-[#F8FAFC] px-2 focus-within:border-[#D4AF37] focus-within:bg-white focus-within:ring-2 focus-within:ring-[#D4AF37]/20"
      >
        <button
          type="submit"
          className="flex shrink-0 items-center justify-center text-[var(--color-text-muted)]"
          onClick={(e) => {
            if (!open && !inputRef.current?.value) {
              e.preventDefault();
              setOpen(true);
            }
          }}
          aria-label={t("search.title")}
        >
          <Search size={13} strokeWidth={1.5} />
        </button>
        <input
          ref={inputRef}
          name="q"
          placeholder={t("nav.search")}
          aria-label={t("search.title")}
          className="min-w-0 flex-1 border-0 bg-transparent text-[12px] text-[var(--color-text-primary)] outline-none placeholder:text-[var(--color-text-muted)]"
          onFocus={() => setOpen(true)}
        />
        <kbd className="hidden rounded border border-[var(--color-border)] bg-white px-1 py-px text-[9px] font-medium text-[var(--color-text-muted)] sm:inline">
          ⌘K
        </kbd>
      </form>
    </div>
  );
}
