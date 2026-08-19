import { BottomNav } from "@/components/bottom-nav";
import { AppShellMobileHeader } from "@/components/app-shell-mobile-header";
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
  unread?: number;
  locale: Locale;
  shiftBar?: React.ReactNode;
  children: React.ReactNode;
};

export function AppShell({
  unread = 0,
  locale,
  permissions,
  roleCode,
  children,
}: Props) {
  return (
    <div className="mobile-stone-shell flex h-[100dvh] overflow-hidden text-[var(--color-text-primary)]">
      <div className="relative flex min-w-0 flex-1 flex-col overflow-hidden">
        <div className="sticky top-0 z-40 shrink-0 print:hidden">
          <AppShellMobileHeader unread={unread} locale={locale} />
        </div>

        <AppShellMain>{children}</AppShellMain>
      </div>
      <BottomNav permissions={permissions} roleCode={roleCode} locale={locale} />
      <OfflineSync locale={locale} />
      <NotificationWatch locale={locale} />
      <HelpGuide locale={locale} />
    </div>
  );
}
