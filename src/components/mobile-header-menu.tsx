"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";
import { LanguageSwitcher } from "@/components/language-switcher";
import { LogoutButton } from "@/components/logout-button";
import { NAV_ICONS, ICON_STROKE } from "@/components/nav-icons";
import { moreGroupsForRole } from "@core/shared/nav";
import type { Locale } from "@core/shared/i18n/i18n";
import { createT } from "@core/shared/i18n/i18n";
import styles from "./mobile-header-menu.module.css";

export function MobileHeaderMenu({
  open,
  onClose,
  locale,
  userName,
  roleName,
  roleCode,
  permissions,
}: {
  open: boolean;
  onClose: () => void;
  locale: Locale;
  userName: string;
  roleName: string;
  roleCode: string;
  permissions: string[];
}) {
  const t = createT(locale);
  const [mounted, setMounted] = useState(false);

  const groups = useMemo(
    () => moreGroupsForRole(roleCode, permissions),
    [roleCode, permissions],
  );

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!open) return;
    const html = document.documentElement;
    const body = document.body;
    const prevHtmlOverflow = html.style.overflow;
    const prevBodyOverflow = body.style.overflow;
    html.style.overflow = "hidden";
    body.style.overflow = "hidden";
    return () => {
      html.style.overflow = prevHtmlOverflow;
      body.style.overflow = prevBodyOverflow;
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [open, onClose]);

  const closeAndNavigate = useCallback(() => {
    onClose();
  }, [onClose]);

  if (!mounted || !open) return null;

  return createPortal(
    <>
      <button type="button" className={styles.backdrop} aria-label={t("help.close")} onClick={onClose} />
      <nav id="mobile-header-menu" className={styles.panel} aria-label={t("nav.more")}>
        <div className={styles.headCard}>
          <div className={styles.userBlock}>
            <p className={styles.userName}>{userName}</p>
            <p className={styles.roleName}>{roleName}</p>
          </div>
          <div className={styles.headActions}>
            <LanguageSwitcher locale={locale} size="sm" />
            <button type="button" className={styles.closeBtn} aria-label={t("help.close")} onClick={onClose}>
              <X size={20} strokeWidth={ICON_STROKE} aria-hidden />
            </button>
          </div>
        </div>

        {groups.map((group) => (
          <section key={group.id} className={styles.group}>
            {group.labelKey ? (
              <h2 className={styles.groupTitle}>{t(group.labelKey)}</h2>
            ) : null}
            <ul className={styles.list}>
              {group.items.map((item) => {
                const Icon = NAV_ICONS[item.icon];
                return (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      className={styles.row}
                      prefetch
                      onClick={closeAndNavigate}
                      data-tour={item.tour ?? `nav-${item.id}`}
                    >
                      <span className={styles.rowIcon}>
                        <Icon size={18} strokeWidth={ICON_STROKE} aria-hidden />
                      </span>
                      <span className={styles.rowLabel}>{t(item.labelKey)}</span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          </section>
        ))}

        <div className={styles.account}>
          <Link href="/help" className={styles.accountLink} onClick={closeAndNavigate}>
            {t("nav.help")}
          </Link>
          <Link href="/me/profile" className={styles.accountLink} onClick={closeAndNavigate}>
            {t("nav.profile")}
          </Link>
          <div className={styles.accountLogout}>
            <LogoutButton label={t("nav.logout")} />
          </div>
        </div>
      </nav>
    </>,
    document.body,
  );
}
