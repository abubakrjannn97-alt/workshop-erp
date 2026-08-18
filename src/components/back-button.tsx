"use client";

import { usePathname, useRouter } from "next/navigation";
import { ChevronLeft } from "lucide-react";
import type { Locale } from "@core/shared/i18n/i18n";
import { createT } from "@core/shared/i18n/i18n";

function fallbackHref(path: string) {
  const parts = path.split("/").filter(Boolean);
  if (parts.length <= 1) return "/";
  return `/${parts.slice(0, -1).join("/")}`;
}

export function BackButton({
  locale,
  variant = "light",
  iconOnly = false,
  className = "",
}: {
  locale: Locale;
  variant?: "light" | "dark";
  iconOnly?: boolean;
  className?: string;
}) {
  const router = useRouter();
  const path = usePathname();
  const t = createT(locale);

  if (path === "/") return null;

  function goBack() {
    const href = fallbackHref(path);
    if (typeof window !== "undefined" && window.history.length > 1) {
      router.back();
      return;
    }
    router.push(href);
  }

  const dark = variant === "dark";

  if (iconOnly) {
    return (
      <button
        type="button"
        onClick={goBack}
        aria-label={t("common.back")}
        className={`ui-header-icon ${className}`}
      >
        <ChevronLeft size={22} strokeWidth={1.75} aria-hidden="true" />
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={goBack}
      aria-label={t("common.back")}
      className={
        dark
          ? `inline-flex h-10 shrink-0 items-center gap-1 rounded-lg px-2.5 text-[13px] font-semibold text-[#F7F4EE] transition-colors hover:bg-white/8 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] ${className}`
          : `inline-flex h-10 min-h-10 shrink-0 items-center gap-1 rounded-lg px-2 text-[13px] font-medium text-[var(--ink-2)] transition-colors hover:bg-[var(--surface-2)] hover:text-[var(--ink)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] ${className}`
      }
    >
      <ChevronLeft size={18} strokeWidth={1.75} aria-hidden="true" />
      <span>{t("common.back")}</span>
    </button>
  );
}
