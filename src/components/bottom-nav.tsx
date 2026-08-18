"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import type { Locale } from "@core/shared/i18n/i18n";
import { createT } from "@core/shared/i18n/i18n";
import { NAV_ICONS } from "@/components/nav-icons";
import {
  bottomTabsForRole,
  isTabActive,
  type BottomTab,
} from "@core/shared/nav";
import styles from "./bottom-nav.module.css";

export function BottomNav({
  permissions,
  roleCode,
  locale,
}: {
  permissions: string[];
  roleCode: string;
  locale: Locale;
}) {
  const path = usePathname();
  const router = useRouter();
  const t = createT(locale);
  const [pendingHref, setPendingHref] = useState<string | null>(null);
  const tabs = bottomTabsForRole(roleCode, permissions);
  const activePath = pendingHref ?? path;

  const warm = useCallback(
    (href: string) => {
      router.prefetch(href);
    },
    [router],
  );

  useEffect(() => {
    setPendingHref(null);
  }, [path]);

  useEffect(() => {
    for (const tab of tabs) {
      router.prefetch(tab.href);
    }
  }, [router, tabs]);

  if (tabs.length === 0) return null;

  return (
    <div className={`${styles.shell} print:hidden lg:hidden`}>
      <nav className={styles.bar} aria-label={t("nav.menu")}>
        {tabs.map((tab) => {
          const active = isTabActive(activePath, tab, tabs);
          const Icon = NAV_ICONS[tab.icon];
          const label = t(tab.labelKey);
          const pending = pendingHref === tab.href;
          return (
            <Link
              key={tab.id}
              href={tab.href}
              prefetch
              onMouseEnter={() => warm(tab.href)}
              onTouchStart={() => warm(tab.href)}
              onClick={() => setPendingHref(tab.href)}
              data-tour={tab.tour ?? `nav-${tab.id}`}
              aria-label={label}
              aria-current={active ? "page" : undefined}
              className={`${styles.tab} ${active ? styles.tabActive : ""} ${pending ? styles.tabPending : ""}`}
            >
              <span className={styles.iconWrap}>
                <Icon size={20} strokeWidth={1.75} aria-hidden />
              </span>
              <span className={styles.label}>{label}</span>
            </Link>
          );
        })}
      </nav>
    </div>
  );
}

export type { BottomTab };
