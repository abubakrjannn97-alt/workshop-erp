"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { ChevronLeft, Menu, X } from "lucide-react";
import { NotificationBell } from "@/components/notification-bell";
import { MobileHeaderMenu } from "@/components/mobile-header-menu";
import { WorkshopMark } from "@/components/workshop-mark";
import { ICON_STROKE } from "@/components/nav-icons";
import { resolveBackHref } from "@core/shared/back-nav";
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
  const backHref = resolveBackHref(pathname);
  const t = createT(locale);

  useEffect(() => {
    setMenuOpen(false);
  }, [pathname]);

  return (
    <>
      <header className={styles.bar}>
        {backHref ? (
          <Link
            href={backHref}
            className={styles.menuBtn}
            aria-label={t("common.back")}
            scroll={false}
          >
            <ChevronLeft size={22} strokeWidth={ICON_STROKE} aria-hidden />
          </Link>
        ) : (
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
        )}
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
