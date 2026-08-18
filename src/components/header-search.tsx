"use client";

import { useEffect, useRef, useState } from "react";
import { Search } from "lucide-react";
import type { Locale } from "@core/shared/i18n/i18n";
import { createT } from "@core/shared/i18n/i18n";
import { ICON_STROKE } from "@/components/nav-icons";
import styles from "./header-search.module.css";

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
    <div ref={wrapRef} className={styles.wrap} data-tour="nav-search">
      <form action="/search" className={styles.form}>
        <button
          type="submit"
          className={styles.iconBtn}
          onClick={(e) => {
            if (!open && !inputRef.current?.value) {
              e.preventDefault();
              setOpen(true);
            }
          }}
          aria-label={t("search.title")}
        >
          <Search size={18} strokeWidth={ICON_STROKE} aria-hidden />
        </button>
        <input
          ref={inputRef}
          name="q"
          placeholder={t("nav.search")}
          aria-label={t("search.title")}
          className={styles.input}
          onFocus={() => setOpen(true)}
        />
        <kbd className={styles.kbd}>⌘K</kbd>
      </form>
    </div>
  );
}
