"use client";

import { usePathname } from "next/navigation";
import { BackButton } from "@/components/back-button";
import { LanguageSwitcher } from "@/components/language-switcher";
import { NotificationBell } from "@/components/notification-bell";
import { WorkshopMark } from "@/components/workshop-mark";
import type { Locale } from "@core/shared/i18n/i18n";

export function AppShellMobileHeader({
  companyName,
  unread,
  locale,
  mobileShiftBar,
}: {
  companyName: string;
  unread: number;
  locale: Locale;
  mobileShiftBar?: React.ReactNode;
}) {
  const path = usePathname();
  const isHome = path === "/";

  return (
    <header
      className="app-shell-mobile-header flex min-h-[44px] items-center justify-between gap-3 border-b border-[var(--color-border)] bg-[var(--color-surface)] px-4 py-2"
      style={{ paddingTop: "calc(8px + env(safe-area-inset-top))" }}
    >
      <div className="flex min-w-0 flex-1 items-center gap-2">
        {isHome ? (
          <>
            <WorkshopMark size={32} className="rounded-[22%]" />
            <p className="min-w-0 flex-1 truncate text-sm font-semibold text-[var(--color-text-primary)]">
              {companyName}
            </p>
          </>
        ) : (
          <BackButton locale={locale} />
        )}
      </div>
      <div className="flex shrink-0 items-center gap-1">
        {mobileShiftBar}
        <LanguageSwitcher locale={locale} />
        <NotificationBell unread={unread} locale={locale} />
      </div>
    </header>
  );
}
