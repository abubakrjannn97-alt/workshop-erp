import { Sidebar } from "@/components/sidebar";
import { BottomNav } from "@/components/bottom-nav";
import { AppShellMobileHeader } from "@/components/app-shell-mobile-header";
import { AppShellDesktopHeader } from "@/components/app-shell-desktop-header";
import { AppShellMain } from "@/components/app-shell-main";
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
    <div className="mobile-stone-shell desktop-stone-shell flex h-[100dvh] overflow-hidden text-[var(--color-text-primary)] lg:bg-transparent">
      <Sidebar
        companyName={companyName}
        userName={userName}
        roleName={roleName}
        permissions={permissions}
        roleCode={roleCode}
        locale={locale}
      />
      <div className="relative flex min-w-0 flex-1 flex-col overflow-hidden lg:bg-transparent">
        <div className="z-[110] shrink-0 print:hidden lg:hidden">
          <AppShellMobileHeader
            unread={unread}
            locale={locale}
            userName={userName}
            roleName={roleName}
            roleCode={roleCode}
            permissions={permissions}
            workerShell={workerShell}
          />
        </div>

        <div className="sticky top-0 z-30 hidden shrink-0 print:hidden lg:block">
          <AppShellDesktopHeader
            userName={userName}
            roleName={roleName}
            unread={unread}
            locale={locale}
            workerShell={workerShell}
          />
        </div>

        <AppShellMain>{children}</AppShellMain>
      </div>
      <BottomNav permissions={permissions} roleCode={roleCode} locale={locale} />
      {!workerShell ? <OfflineSync locale={locale} /> : null}
      {!workerShell ? <NotificationWatch locale={locale} /> : null}
      {!workerShell ? <HelpGuide locale={locale} /> : null}
    </div>
  );
}
