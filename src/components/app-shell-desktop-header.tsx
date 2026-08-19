"use client";

import { usePathname } from "next/navigation";
import { HeaderBackButton } from "@/components/header-back-button";
import { HeaderSearch } from "@/components/header-search";
import { HelpHeaderLink } from "@/components/help-guide";
import { LanguageSwitcher } from "@/components/language-switcher";
import { NotificationBell } from "@/components/notification-bell";
import { isNestedShellPath, shellPageContext } from "@/components/shell-page-context";
import type { Locale } from "@core/shared/i18n/i18n";
import { createT } from "@core/shared/i18n/i18n";
import styles from "./app-shell-desktop-header.module.css";

function initialsOf(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");
}

export function AppShellDesktopHeader({
  userName,
  roleName,
  unread,
  locale,
  shiftBar,
}: {
  userName: string;
  roleName: string;
  unread: number;
  locale: Locale;
  shiftBar?: React.ReactNode;
}) {
  const path = usePathname();
  const t = createT(locale);
  const ctx = shellPageContext(path);
  const nested = isNestedShellPath(path);
  const contextLabel = ctx ? t(ctx.labelKey) : null;

  return (
    <header className={styles.bar}>
      <div className={styles.context}>
        {nested ? <HeaderBackButton locale={locale} className="ui-header-icon" /> : null}
        {contextLabel && nested ? <p className={styles.title}>{contextLabel}</p> : null}
      </div>
      <div className={styles.search}>
        <HeaderSearch locale={locale} />
      </div>
      <div className={styles.actions}>
        {shiftBar}
        <NotificationBell unread={unread} locale={locale} />
        <HelpHeaderLink locale={locale} />
        <LanguageSwitcher locale={locale} />
        <div className={styles.user}>
          <span className={styles.avatar} aria-hidden>
            {initialsOf(userName) || "U"}
          </span>
          <div className={styles.userMeta}>
            <p className={styles.userName}>{userName}</p>
            <p className={styles.userRole}>{roleName}</p>
          </div>
        </div>
      </div>
    </header>
  );
}
