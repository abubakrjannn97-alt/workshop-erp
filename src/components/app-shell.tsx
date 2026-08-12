"use client";

import { Sidebar, useSidebarOffsetClass } from "@/components/sidebar";
import { MobileNav } from "@/components/mobile-nav";
import { BottomNav } from "@/components/bottom-nav";
import { LanguageSwitcher } from "@/components/language-switcher";
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
  roleCode,
  permissions,
  unread = 0,
  locale,
  children,
}: Props) {
  const offset = useSidebarOffsetClass();

  return (
    <div className="min-h-screen bg-background text-foreground">
      <Sidebar
        companyName={companyName}
        userName={userName}
        permissions={permissions}
        roleCode={roleCode}
        unread={unread}
        locale={locale}
      />
      <div className={offset} style={{ transition: "padding-left var(--transition)" }}>
        <header className="sticky top-0 z-10 flex h-12 items-center justify-between gap-3 border-b border-[var(--line)] bg-[var(--surface)] px-3 print:hidden lg:hidden">
          <p className="truncate text-sm font-semibold">{companyName}</p>
          <div className="flex items-center gap-2">
            <LanguageSwitcher locale={locale} />
            <MobileNav permissions={permissions} roleCode={roleCode} locale={locale} />
          </div>
        </header>
        <header className="sticky top-0 z-10 hidden h-12 items-center justify-end gap-3 border-b border-[var(--line)] bg-[var(--surface)]/95 px-4 print:hidden lg:flex">
          <LanguageSwitcher locale={locale} />
          <span className="text-xs text-[var(--muted)]">{userName}</span>
        </header>
        <main className="mx-auto max-w-6xl px-3 py-4 pb-20 lg:px-6 lg:pb-6">{children}</main>
      </div>
      <BottomNav permissions={permissions} roleCode={roleCode} locale={locale} />
    </div>
  );
}
