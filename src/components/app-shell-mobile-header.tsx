"use client";

import { Menu } from "lucide-react";
import { NotificationBell } from "@/components/notification-bell";
import { WorkshopMark } from "@/components/workshop-mark";
import type { Locale } from "@core/shared/i18n/i18n";
import styles from "./app-shell-mobile-header.module.css";

export function AppShellMobileHeader({
  unread,
  locale,
}: {
  unread: number;
  locale: Locale;
}) {
  return (
    <header className={styles.bar}>
      <button type="button" className={styles.menuBtn} aria-label="Menu">
        <Menu size={24} strokeWidth={1.75} />
      </button>
      <div className={styles.brand} aria-hidden>
        <WorkshopMark size={28} className={styles.brandLogo} />
        <div className={styles.brandText}>
          <span className={styles.brandLine}>Stone</span>
          <span className={styles.brandLine}>Factory</span>
        </div>
      </div>
      <div className={styles.actions}>
        <NotificationBell unread={unread} locale={locale} />
      </div>
    </header>
  );
}
