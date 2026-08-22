"use client";

import { useEffect, useMemo, useState } from "react";
import { usePathname } from "next/navigation";
import { NotificationBell } from "@/components/notification-bell";
import { MobileHeaderMenu } from "@/components/mobile-header-menu";
import { MobileHeaderNavSlot } from "@/components/mobile-header-nav-slot";
import { WorkshopMark } from "@/components/workshop-mark";
import { bottomTabsForRole, tabHrefSet } from "@core/shared/nav";
import type { Locale } from "@core/shared/i18n/i18n";
import { createT } from "@core/shared/i18n/i18n";
import styles from "./app-shell-mobile-header.module.css";

export function AppShellMobileHeader({
  unread,
  locale,
  userName,
  roleName,
  roleCode,
  permissions,
  workerShell = false,
}: {
  unread: number;
  locale: Locale;
  userName: string;
  roleName: string;
  roleCode: string;
  permissions: string[];
  workerShell?: boolean;
}) {
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);
  const tabRoots = useMemo(
    () => tabHrefSet(bottomTabsForRole(roleCode, permissions)),
    [roleCode, permissions],
  );
  const t = createT(locale);

  useEffect(() => {
    setMenuOpen(false);
  }, [pathname]);

  const isWorker = workerShell;

  return (
    <>
      <header className={styles.bar}>
        <MobileHeaderNavSlot
          tabRoots={tabRoots}
          workerShell={isWorker}
          backLabel={t("common.back")}
          menuLabel={t("nav.more")}
          menuOpen={menuOpen}
          onMenuToggle={() => setMenuOpen((open) => !open)}
        />
        <div className={styles.brand} aria-hidden>
          <WorkshopMark size={24} className={styles.brandLogo} />
          <div className={styles.brandText}>
            <span className={styles.brandLine}>Stone</span>
            <span className={styles.brandLine}>Factory</span>
          </div>
        </div>
        <div className={styles.actions}>
          {!isWorker ? <NotificationBell unread={unread} locale={locale} /> : null}
        </div>
      </header>
      {!isWorker ? (
        <MobileHeaderMenu
          open={menuOpen}
          onClose={() => setMenuOpen(false)}
          locale={locale}
          userName={userName}
          roleName={roleName}
          roleCode={roleCode}
          permissions={permissions}
        />
      ) : null}
    </>
  );
}
