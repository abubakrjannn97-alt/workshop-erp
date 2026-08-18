"use client";

import { usePathname } from "next/navigation";
import { BackButton } from "@/components/back-button";
import { LanguageSwitcher } from "@/components/language-switcher";
import { NotificationBell } from "@/components/notification-bell";
import { isNestedShellPath, shellPageContext } from "@/components/shell-page-context";
import type { Locale } from "@core/shared/i18n/i18n";
import { createT } from "@core/shared/i18n/i18n";
import styles from "./app-shell-mobile-header.module.css";

export function AppShellMobileHeader({
  companyName,
  unread,
  locale,
  mobileShiftBar,
}: {
  companyName: string;
  unread: number;
  locale: Locale;
  mobileShiftBar?: React.ReactNode;
}) {
  const path = usePathname();
  const t = createT(locale);
  const ctx = shellPageContext(path);
  const nested = isNestedShellPath(path);
  const title = ctx ? t(ctx.labelKey) : companyName;

  return (
    <header className={styles.bar}>
      <div className={styles.left}>
        {nested ? <BackButton locale={locale} iconOnly /> : null}
        <h1 className={styles.title}>{title}</h1>
      </div>
      <div className={styles.actions}>
        {mobileShiftBar}
        <LanguageSwitcher locale={locale} />
        <NotificationBell unread={unread} locale={locale} />
      </div>
    </header>
  );
}
