import { Suspense } from "react";
import { Sidebar } from "@/components/sidebar";
import { BottomNav } from "@/components/bottom-nav";
import { AppShellContent } from "@/components/app-shell-content";
import { NavHistoryTracker } from "@/components/nav-history-tracker";
import { VisualViewportSync } from "@/components/visual-viewport-sync";
import { HelpGuide } from "@/components/help-guide";
import { NotificationWatch } from "@/components/notification-watch";
import { OfflineSync } from "@/components/offline-sync";
import type { Locale } from "@core/shared/i18n/i18n";

type Props = {
  companyName: string;
  userName: string;
  roleName: string;
  roleCode: string;
  permissions: string[];
  workerShell?: boolean;
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
  workerShell = false,
  unread = 0,
  locale,
  children,
}: Props) {
  return (
    <>
      <div className="mobile-stone-shell desktop-stone-shell flex overflow-hidden text-[var(--color-text-primary)] lg:h-[100dvh] lg:bg-transparent">
        <Sidebar
          companyName={companyName}
          userName={userName}
          roleName={roleName}
          permissions={permissions}
          roleCode={roleCode}
          locale={locale}
        />
        <div className="relative flex min-w-0 flex-1 flex-col overflow-hidden lg:bg-transparent">
          <AppShellContent locale={locale} roleCode={roleCode} permissions={permissions}>
            {children}
          </AppShellContent>
        </div>
        {!workerShell ? <OfflineSync locale={locale} /> : null}
        {!workerShell ? <NotificationWatch locale={locale} /> : null}
        {!workerShell ? <HelpGuide locale={locale} /> : null}
      </div>
      <BottomNav permissions={permissions} roleCode={roleCode} locale={locale} />
      <Suspense fallback={null}>
        <NavHistoryTracker />
        <VisualViewportSync />
      </Suspense>
    </>
  );
}
