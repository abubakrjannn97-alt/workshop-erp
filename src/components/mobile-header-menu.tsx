"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { CircleQuestionMark, Settings, User, X } from "lucide-react";
import { LanguageSwitcher } from "@/components/language-switcher";
import { QUICK_ACTION_ICONS } from "@/components/dashboard/dash-quick-action-icons";
import { ICON_STROKE } from "@/components/nav-icons";
import { mobileMenuQuickActions } from "@/components/mobile-menu-quick-actions";
import { canSee, SETTINGS_ITEM } from "@core/shared/nav";
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
  const pathname = usePathname();
  const t = createT(locale);
  const [mounted, setMounted] = useState(false);

  const quickActions = useMemo(
    () => mobileMenuQuickActions(roleCode, permissions, t),
    [roleCode, permissions, t],
  );

  const showSettings = canSee(permissions, roleCode, SETTINGS_ITEM);

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
      <nav id="mobile-header-menu" className={styles.panel} aria-label={t("nav.menu")}>
        <div className={styles.headCard}>
          <div className={styles.userBlock}>
            <p className={styles.userName}>{userName}</p>
            <p className={styles.roleName}>{roleName}</p>
          </div>
          <button type="button" className={styles.closeBtn} aria-label={t("help.close")} onClick={onClose}>
            <X size={20} strokeWidth={ICON_STROKE} aria-hidden />
          </button>
        </div>

        <section className={styles.card}>
          <h2 className={styles.sectionTitle}>{t("lang.switch")}</h2>
          <div className={styles.langRow}>
            <LanguageSwitcher locale={locale} />
          </div>
        </section>

        {quickActions.length > 0 ? (
          <section className={styles.card}>
            <h2 className={styles.sectionTitle}>{t("home.quickActions")}</h2>
            <ul className={styles.actionList}>
              {quickActions.map((action) => {
                const Icon = QUICK_ACTION_ICONS[action.icon];
                return (
                  <li key={action.href}>
                    <Link href={action.href} className={styles.actionLink} onClick={closeAndNavigate}>
                      <span className={styles.actionIcon}>
                        <Icon size={20} strokeWidth={ICON_STROKE} aria-hidden />
                      </span>
                      {action.label}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </section>
        ) : null}

        <div className={styles.footerCard}>
          <Link href="/help" className={styles.footerLink} onClick={closeAndNavigate}>
            <CircleQuestionMark size={18} strokeWidth={ICON_STROKE} aria-hidden />
            {t("nav.help")}
          </Link>
          {pathname.startsWith("/me") ? (
            <Link href="/me/profile" className={styles.footerLink} onClick={closeAndNavigate}>
              <User size={18} strokeWidth={ICON_STROKE} aria-hidden />
              {t("nav.profile")}
            </Link>
          ) : null}
          {showSettings ? (
            <Link href={SETTINGS_ITEM.href} className={styles.footerLink} onClick={closeAndNavigate}>
              <Settings size={18} strokeWidth={ICON_STROKE} aria-hidden />
              {t("nav.settings")}
            </Link>
          ) : null}
        </div>
      </nav>
    </>,
    document.body,
  );
}
