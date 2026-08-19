"use client";

import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { Plus, Search, X } from "lucide-react";
import { ICON_STROKE } from "@/components/nav-icons";
import styles from "./orders.module.css";

export function OrdersMobileHeaderTools({
  searchLabel,
  searchPlaceholder,
  initialQ,
  canCreate,
  newOrderHref,
  newOrderLabel,
}: {
  searchLabel: string;
  searchPlaceholder: string;
  initialQ?: string;
  canCreate: boolean;
  newOrderHref: string;
  newOrderLabel: string;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const inputRef = useRef<HTMLInputElement>(null);
  const [open, setOpen] = useState(Boolean(initialQ?.trim()));
  const [value, setValue] = useState(initialQ ?? "");

  useEffect(() => {
    setValue(initialQ ?? "");
    if (initialQ?.trim()) setOpen(true);
  }, [initialQ]);

  useEffect(() => {
    if (open) inputRef.current?.focus();
  }, [open]);

  function applySearch(next: string) {
    const params = new URLSearchParams(searchParams.toString());
    const trimmed = next.trim();
    if (trimmed) params.set("q", trimmed);
    else params.delete("q");
    params.delete("page");
    const query = params.toString();
    router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false });
  }

  function clearSearch() {
    setValue("");
    setOpen(false);
    applySearch("");
  }

  return (
    <div className={styles.mobileHeaderToolsGrid}>
      <div className={styles.mobileHeaderIcons}>
        <button
          type="button"
          className={`${styles.iconBtn} ${open ? styles.iconBtnActive : ""}`.trim()}
          aria-label={searchLabel}
          aria-expanded={open}
          onClick={() => setOpen((v) => !v)}
        >
          <Search size={20} strokeWidth={ICON_STROKE} aria-hidden />
        </button>
        {canCreate ? (
          <Link href={newOrderHref} className={styles.iconBtn} aria-label={newOrderLabel} data-tour="orders-new-mobile">
            <Plus size={20} strokeWidth={ICON_STROKE} />
          </Link>
        ) : null}
      </div>

      {open ? (
        <form
          className={styles.mobileSearchBar}
          onSubmit={(event) => {
            event.preventDefault();
            applySearch(value);
          }}
        >
          <Search size={16} strokeWidth={ICON_STROKE} className={styles.mobileSearchIcon} aria-hidden />
          <input
            ref={inputRef}
            type="search"
            value={value}
            onChange={(event) => setValue(event.target.value)}
            placeholder={searchPlaceholder}
            aria-label={searchLabel}
            className={styles.mobileSearchInput}
            enterKeyHint="search"
          />
          <button type="button" className={styles.mobileSearchClear} aria-label="Clear" onClick={clearSearch}>
            <X size={16} strokeWidth={ICON_STROKE} aria-hidden />
          </button>
        </form>
      ) : null}
    </div>
  );
}
