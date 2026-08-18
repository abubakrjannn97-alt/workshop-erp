"use client";

import { usePathname } from "next/navigation";
import { Sidebar } from "@/components/sidebar";
import { BackButton } from "@/components/back-button";
import { BottomNav } from "@/components/bottom-nav";
import { LanguageSwitcher } from "@/components/language-switcher";
import { HelpGuide, HelpHeaderLink } from "@/components/help-guide";
import { NotificationBell } from "@/components/notification-bell";
import { HeaderSearch } from "@/components/header-search";
import { WorkshopMark } from "@/components/workshop-mark";
import { NotificationWatch } from "@/components/notification-watch";
import { OfflineSync } from "@/components/offline-sync";
import { ChevronDown } from "lucide-react";
import type { Locale } from "@core/shared/i18n/i18n";

type Props = {
  companyName: string;
  userName: string;
  roleName: string;
  roleCode: string;
  permissions: string[];
  unread?: number;
  locale: Locale;
  shiftBar?: React.ReactNode;
  mobileShiftBar?: React.ReactNode;
  children: React.ReactNode;
};

export function AppShell({
  companyName,
  userName,
  roleName,
  roleCode,
  permissions,
  unread = 0,
  locale,
  shiftBar,
  mobileShiftBar,
  children,
}: Props) {
  const path = usePathname();
  const isHome = path === "/";
  const initials = userName
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() ?? "")
    .join("");

  return (
    <div className="flex h-screen overflow-hidden bg-[var(--color-background)] text-[var(--color-text-primary)]">
      <Sidebar
        companyName={companyName}
        permissions={permissions}
        roleCode={roleCode}
        locale={locale}
      />
      <div className="relative flex min-w-0 flex-1 flex-col overflow-hidden bg-[var(--color-background)]">
        <div className="relative z-20 print:hidden lg:hidden">
          <header
            className="flex items-center justify-between gap-3 px-5"
            style={{
              background: "rgba(11, 14, 26, 0.42)",
              backdropFilter: "blur(16px) saturate(1.2)",
              WebkitBackdropFilter: "blur(16px) saturate(1.2)",
              paddingTop: "calc(6px + env(safe-area-inset-top))",
              paddingBottom: 6,
            }}
          >
            <div className="flex min-w-0 flex-1 items-center gap-2.5">
              {isHome ? (
                <>
                  <WorkshopMark size={36} className="rounded-[22%]" />
                  <p className="min-w-0 flex-1 text-[11px] font-semibold leading-[1.2] text-white line-clamp-2">
                    {companyName}
                  </p>
                </>
              ) : (
                <BackButton locale={locale} variant="dark" />
              )}
            </div>
            <div className="flex shrink-0 items-center gap-2">
              {mobileShiftBar}
              <LanguageSwitcher locale={locale} variant="dark" />
              <NotificationBell unread={unread} locale={locale} variant="dark" />
            </div>
          </header>
        </div>

        <div className="sticky top-0 z-10 hidden print:hidden lg:block">
          <header className="app-topbar flex h-10 items-center gap-2 px-3">
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
                <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-[#0E1522] text-[9px] font-semibold text-[#D4AF37]">
                  {initials || "U"}
                </span>
                <div className="min-w-0 leading-tight">
                  <p className="max-w-[110px] truncate text-[11px] font-semibold text-[#101828]">
                    {userName}
                  </p>
                  <p className="max-w-[110px] truncate text-[10px] text-[#98A2B3]">{roleName}</p>
                </div>
                <ChevronDown size={11} strokeWidth={1.5} className="text-[#98A2B3]" />
              </div>
            </div>
          </header>
        </div>

        <main
          className={
            isHome
              ? "relative z-10 min-w-0 flex-1 overflow-y-auto overflow-x-hidden bg-transparent lg:px-3 lg:py-3 lg:pb-4"
              : "relative z-10 min-w-0 flex-1 overflow-y-auto overflow-x-hidden bg-transparent px-3 py-3 pb-[calc(4.75rem+env(safe-area-inset-bottom))] lg:px-3 lg:py-3 lg:pb-4"
          }
        >
          {children}
        </main>
      </div>
      <BottomNav permissions={permissions} roleCode={roleCode} locale={locale} />
      <OfflineSync locale={locale} />
      <NotificationWatch locale={locale} />
      <HelpGuide locale={locale} />
    </div>
  );
}
