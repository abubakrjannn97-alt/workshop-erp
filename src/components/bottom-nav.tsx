"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import type { Locale } from "@/lib/i18n";
import { createT } from "@/lib/i18n";
import {
  bottomTabsForRole,
  isTabActive,
  type NavIcon,
  type BottomTab,
} from "@/lib/nav";
import {
  IconHome,
  IconUsers,
  IconClipboard,
  IconFactory,
  IconWarehouse,
  IconMenu,
  IconTruck,
  IconWallet,
  IconUser,
  IconChart,
  IconReceipt,
  IconAlert,
  IconCart,
  IconBox,
} from "@/components/icons";
import styles from "./bottom-nav.module.css";

const ICONS: Record<NavIcon, typeof IconHome> = {
  home: IconHome,
  sales: IconCart,
  crm: IconUsers,
  orders: IconClipboard,
  products: IconBox,
  production: IconFactory,
  warehouse: IconWarehouse,
  purchasing: IconTruck,
  finance: IconWallet,
  employees: IconUser,
  analytics: IconChart,
  settings: IconMenu,
  help: IconMenu,
  more: IconMenu,
  commission: IconWallet,
  batches: IconClipboard,
  scrap: IconAlert,
  inventory: IconBox,
  expenses: IconReceipt,
  jobs: IconFactory,
  history: IconClipboard,
  profile: IconUser,
  reports: IconChart,
  notifications: IconAlert,
  search: IconMenu,
};

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
          const Icon = ICONS[tab.icon] ?? IconMenu;
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
              className={`${styles.tab} ${active ? styles.tabActive : ""} ${pending ? styles.tabPending : ""}`}
            >
              <span className={styles.iconWrap}>
                <Icon size={19} />
              </span>
              <span className={styles.label}>{t(tab.labelKey)}</span>
              <span className={styles.dot} aria-hidden="true" />
            </Link>
          );
        })}
      </nav>
    </div>
  );
}

export function NavIconGlyph({ icon, size = 18 }: { icon: NavIcon; size?: number }) {
  const Icon = ICONS[icon] ?? IconMenu;
  return <Icon size={size} />;
}

export type { BottomTab };
