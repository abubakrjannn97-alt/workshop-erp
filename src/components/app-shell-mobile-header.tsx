"use client";

import { NotificationBell } from "@/components/notification-bell";
import { StoneStackMark } from "@/components/stone-stack-mark";
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
      <h1 className={styles.title}>
        <span className={styles.titleLine}>{t("shell.workshopTitleLine1")}</span>
        <span className={styles.titleLine}>{t("shell.workshopTitleLine2")}</span>
      </h1>
      <div className={styles.logo} aria-hidden>
        <StoneStackMark size={32} />
      </div>
      <div className={styles.actions}>
        <NotificationBell unread={unread} locale={locale} />
      </div>
    </header>
  );
}
