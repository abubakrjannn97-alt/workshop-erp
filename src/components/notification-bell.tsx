"use client";

import Link from "next/link";
import { Bell } from "lucide-react";
import type { Locale } from "@core/shared/i18n/i18n";
import { createT } from "@core/shared/i18n/i18n";
import { ICON_STROKE } from "@/components/nav-icons";

export function NotificationBell({
  unread,
  locale,
}: {
  unread: number;
  locale: Locale;
  variant?: "light" | "dark" | "home";
}) {
  const t = createT(locale);
  return (
    <Link
      href="/notifications"
      data-tour="nav-bell"
      title={t("nav.notifications")}
      aria-label={t("nav.notifications")}
      className="ui-header-icon relative"
    >
      <Bell size={20} strokeWidth={ICON_STROKE} aria-hidden />
      {unread > 0 ? (
        <span className="absolute right-1 top-1 min-w-[16px] rounded-full bg-[var(--bad)] px-1 text-center text-[11px] font-semibold leading-4 text-white">
          {unread > 9 ? "9+" : unread}
        </span>
      ) : null}
    </Link>
  );
}
