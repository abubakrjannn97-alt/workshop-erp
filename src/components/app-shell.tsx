"use client";

import { usePathname } from "next/navigation";
import { Sidebar } from "@/components/sidebar";
import { BottomNav } from "@/components/bottom-nav";
import { LanguageSwitcher } from "@/components/language-switcher";
import { HelpGuide, HelpHeaderLink } from "@/components/help-guide";
import { NotificationBell } from "@/components/notification-bell";
import { HeaderSearch } from "@/components/header-search";
import { WorkshopMark } from "@/components/workshop-mark";
import { NotificationWatch } from "@/components/notification-watch";
import { ChevronDown } from "lucide-react";
import type { Locale } from "@/lib/i18n";

type Props = {
  companyName: string;
  userName: string;
  roleName: string;
  roleCode: string;
  permissions: string[];
  unread?: number;
  locale: Locale;
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
  const roleLetter = (roleName.trim()[0] ?? initials[0] ?? "U").toUpperCase();

  return (
    <div className="flex h-screen overflow-hidden bg-[#0B0E1A] text-[var(--color-text-primary)] lg:bg-[var(--color-background)]">
      <Sidebar
        companyName={companyName}
        permissions={permissions}
        roleCode={roleCode}
        locale={locale}
      />
      <div className="relative flex min-w-0 flex-1 flex-col overflow-hidden">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 z-0 lg:hidden"
          style={{
            background: "linear-gradient(180deg, #0B0E1A 0%, #16130F 180px, #F3F4F7 380px, #FFFFFF 100%)",
          }}
        />
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
            <div className="flex min-w-0 items-center gap-2.5">
              <WorkshopMark size={36} className="rounded-[22%]" />
              <p className="min-w-0 flex-1 text-[11px] font-semibold leading-[1.2] text-white line-clamp-2">
                {companyName}
              </p>
            </div>
            <div className="flex shrink-0 items-center gap-2">
              <LanguageSwitcher locale={locale} variant="dark" />
              <NotificationBell unread={unread} locale={locale} variant="dark" />
              <span className="relative inline-flex h-9 w-9 items-center justify-center rounded-full border border-[rgba(232,201,120,0.55)] bg-[#14110D] text-[13px] font-semibold text-[#E8C978]">
                {roleLetter}
                <span className="absolute -right-0.5 -top-0.5 h-2 w-2 rounded-full bg-[var(--success-500)] ring-2 ring-[#0B0E1A]" />
              </span>
            </div>
          </header>
        </div>

        <div className="sticky top-0 z-10 hidden print:hidden lg:block">
          <header className="app-topbar flex h-10 items-center gap-2 px-3">
            <div className="flex min-w-0 flex-1">
              <HeaderSearch locale={locale} />
            </div>
            <div className="flex shrink-0 items-center gap-1">
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
              ? "relative z-10 min-w-0 flex-1 overflow-y-auto overflow-x-hidden bg-transparent lg:bg-[var(--color-background)] lg:px-3 lg:py-3 lg:pb-4"
              : "relative z-10 min-w-0 flex-1 overflow-y-auto overflow-x-hidden bg-transparent px-3 py-3 pb-[calc(5.25rem+env(safe-area-inset-bottom))] lg:bg-[var(--color-background)] lg:px-3 lg:py-3 lg:pb-4"
          }
        >
          {children}
        </main>
      </div>
      <BottomNav permissions={permissions} roleCode={roleCode} locale={locale} />
      <NotificationWatch locale={locale} />
      <HelpGuide locale={locale} />
    </div>
  );
}
