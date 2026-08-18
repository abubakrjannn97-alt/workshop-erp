"use client";

import Link from "next/link";
import { Bell } from "lucide-react";
import type { Locale } from "@core/shared/i18n/i18n";
import { createT } from "@core/shared/i18n/i18n";

export function NotificationBell({
  unread,
  locale,
  variant = "light",
}: {
  unread: number;
  locale: Locale;
  variant?: "light" | "dark" | "home";
}) {
  const t = createT(locale);
  const dark = variant === "dark";
  const home = variant === "home";
  return (
    <Link
      href="/notifications"
      data-tour="nav-bell"
      title={t("nav.notifications")}
      aria-label={t("nav.notifications")}
      className={
        dark
          ? "relative inline-flex h-11 w-11 items-center justify-center rounded-full text-[#F5F7FA] hover:bg-white/8 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#F3B72F]/40"
          : home
            ? "relative inline-flex h-10 w-10 items-center justify-center rounded-full text-[#5B6575] hover:bg-black/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#F3B72F]/40"
            : "relative inline-flex h-7 w-7 items-center justify-center rounded-lg border border-[#E5E7EB] bg-white text-[#667085] hover:border-[#D4AF37]/40 hover:text-[#101828] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#D4AF37]/40"
      }
    >
      <Bell size={dark ? 24 : home ? 20 : 13} strokeWidth={1.8} />
      {unread > 0 ? (
        <span className="absolute -right-0.5 -top-0.5 min-w-[14px] rounded-full bg-[var(--color-danger)] px-0.5 text-center text-[9px] font-semibold leading-[14px] text-white">
          {unread > 9 ? "9+" : unread}
        </span>
      ) : null}
    </Link>
  );
}
