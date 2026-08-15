"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import type { Locale } from "@/lib/i18n";
import { createT } from "@/lib/i18n";
import {
  bottomTabsForRole,
  isTabActive,
  prefetchHrefs,
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
    for (const href of prefetchHrefs(roleCode, permissions)) {
      router.prefetch(href);
    }
  }, [router, roleCode, permissions]);

  if (tabs.length === 0) return null;

  return (
    <nav
      className="fixed inset-x-0 bottom-0 z-50 flex border-t border-dark-border bg-dark-950 print:hidden lg:hidden"
      style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
    >
      {tabs.map((tab) => {
        const active = isTabActive(activePath, tab, tabs);
        const Icon = ICONS[tab.icon] ?? IconMenu;
        return (
          <Link
            key={tab.id}
            href={tab.href}
            prefetch
            onMouseEnter={() => warm(tab.href)}
            onTouchStart={() => warm(tab.href)}
            onClick={() => setPendingHref(tab.href)}
            data-tour={tab.tour ?? `nav-${tab.id}`}
            className={`flex min-h-16 flex-1 flex-col items-center justify-center gap-1 py-2 text-[11px] transition-[color,transform,opacity] duration-150 active:scale-[0.97] ${
              active ? "font-semibold text-accent-500" : "font-medium text-[var(--text-500)]"
            } ${pendingHref === tab.href ? "opacity-70" : ""}`}
          >
            <Icon size={22} />
            <span className="max-w-[4.8rem] truncate">{t(tab.labelKey)}</span>
            {active ? <span className="mt-0.5 h-1 w-1 rounded-full bg-accent-500" /> : <span className="mt-0.5 h-1 w-1" />}
          </Link>
        );
      })}
    </nav>
  );
}

export function NavIconGlyph({ icon, size = 18 }: { icon: NavIcon; size?: number }) {
  const Icon = ICONS[icon] ?? IconMenu;
  return <Icon size={size} />;
}

export type { BottomTab };
