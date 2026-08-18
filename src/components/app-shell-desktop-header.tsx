"use client";

import { usePathname } from "next/navigation";
import { ChevronDown } from "lucide-react";
import { BackButton } from "@/components/back-button";
import { HeaderSearch } from "@/components/header-search";
import { HelpHeaderLink } from "@/components/help-guide";
import { LanguageSwitcher } from "@/components/language-switcher";
import { NotificationBell } from "@/components/notification-bell";
import type { Locale } from "@core/shared/i18n/i18n";

export function AppShellDesktopHeader({
  userName,
  roleName,
  unread,
  locale,
  shiftBar,
}: {
  userName: string;
  roleName: string;
  unread: number;
  locale: Locale;
  shiftBar?: React.ReactNode;
}) {
  const path = usePathname();
  const isHome = path === "/";
  const initials = userName
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() ?? "")
    .join("");

  return (
    <header className="app-topbar flex h-10 min-h-[40px] items-center gap-2 px-4">
      {!isHome ? <BackButton locale={locale} /> : null}
      <div className="flex min-w-0 flex-1">
        <HeaderSearch locale={locale} />
      </div>
      <div className="flex shrink-0 items-center gap-1">
        {shiftBar}
        <NotificationBell unread={unread} locale={locale} />
        <HelpHeaderLink locale={locale} />
        <LanguageSwitcher locale={locale} />
        <div className="ml-0.5 flex items-center gap-1.5 py-0 pl-0.5 pr-1">
          <span className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-[var(--color-primary)] text-[10px] font-semibold text-[var(--color-accent)]">
            {initials || "U"}
          </span>
          <div className="min-w-0 leading-tight">
            <p className="max-w-[110px] truncate text-xs font-semibold text-[var(--color-text-primary)]">
              {userName}
            </p>
            <p className="max-w-[110px] truncate text-[10px] text-[var(--color-text-muted)]">{roleName}</p>
          </div>
          <ChevronDown size={12} strokeWidth={1.75} className="text-[var(--color-text-muted)]" aria-hidden />
        </div>
      </div>
    </header>
  );
}
