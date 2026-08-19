"use client";

import { NotificationBell } from "@/components/notification-bell";
import type { Locale } from "@core/shared/i18n/i18n";
import { createT } from "@core/shared/i18n/i18n";
import styles from "./app-shell-mobile-header.module.css";

export function AppShellMobileHeader({
  unread,
  locale,
}: {
  unread: number;
  locale: Locale;
}) {
  const t = createT(locale);

  return (
    <header className={styles.bar}>
      <h1 className={styles.title}>{t("shell.workshopTitle")}</h1>
      <NotificationBell unread={unread} locale={locale} />
    </header>
  );
}
