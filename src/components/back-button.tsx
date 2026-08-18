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
  className = "",
}: {
  locale: Locale;
  variant?: "light" | "dark";
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

  return (
    <button
      type="button"
      onClick={goBack}
      aria-label={t("common.back")}
      className={
        dark
          ? `inline-flex shrink-0 items-center gap-1 rounded-full border border-[rgba(232,201,120,0.38)] bg-[rgba(20,17,13,0.72)] px-2.5 py-1.5 text-[12px] font-semibold text-[#F7F4EE] transition-colors hover:border-[rgba(245,213,106,0.55)] hover:bg-[rgba(20,17,13,0.92)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#F3B72F]/40 ${className}`
          : `inline-flex shrink-0 items-center gap-1 rounded-full border border-[#E5E7EB] bg-white px-2.5 py-1 text-[12px] font-semibold text-[#344054] transition-colors hover:border-[#D4AF37]/45 hover:text-[#101828] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#D4AF37]/40 ${className}`
      }
    >
      <ChevronLeft size={16} strokeWidth={2.2} aria-hidden="true" />
      <span>{t("common.back")}</span>
    </button>
  );
}
