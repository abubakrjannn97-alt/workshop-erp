"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { Menu, X } from "lucide-react";
import { NotificationBell } from "@/components/notification-bell";
import { MobileHeaderMenu } from "@/components/mobile-header-menu";
import { WorkshopMark } from "@/components/workshop-mark";
import { ICON_STROKE } from "@/components/nav-icons";
import type { Locale } from "@core/shared/i18n/i18n";
import styles from "./app-shell-mobile-header.module.css";

export function AppShellMobileHeader({
  unread,
  locale,
  userName,
  roleName,
  roleCode,
  permissions,
}: {
  unread: number;
  locale: Locale;
  userName: string;
  roleName: string;
  roleCode: string;
  permissions: string[];
}) {
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    setMenuOpen(false);
  }, [pathname]);

  return (
    <>
      <header className={styles.bar}>
        <button
          type="button"
          className={styles.menuBtn}
          aria-label="Menu"
          aria-expanded={menuOpen}
          aria-controls="mobile-header-menu"
          onClick={() => setMenuOpen((open) => !open)}
        >
          {menuOpen ? (
            <X size={20} strokeWidth={ICON_STROKE} aria-hidden />
          ) : (
            <Menu size={20} strokeWidth={ICON_STROKE} aria-hidden />
          )}
        </button>
        </button>
        <div className={styles.brand} aria-hidden>
          <WorkshopMark size={24} className={styles.brandLogo} />
          <div className={styles.brandText}>
            <span className={styles.brandLine}>Stone</span>
            <span className={styles.brandLine}>Factory</span>
          </div>
        </div>
        <div className={styles.actions}>
          <NotificationBell unread={unread} locale={locale} />
        </div>
      </header>
      <MobileHeaderMenu
        open={menuOpen}
        onClose={() => setMenuOpen(false)}
        locale={locale}
        userName={userName}
        roleName={roleName}
        roleCode={roleCode}
        permissions={permissions}
      />
    </>
  );
}
