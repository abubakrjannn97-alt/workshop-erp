"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { PermissionCode } from "@/lib/permissions";
import { hasPermission } from "@/lib/permissions";
import type { Locale } from "@/lib/i18n";
import { createT } from "@/lib/i18n";
import {
  IconHome,
  IconClipboard,
  IconFactory,
  IconWarehouse,
  IconMenu,
} from "@/components/icons";

const TABS = [
  { href: "/", labelKey: "nav.home", permission: null as PermissionCode | null, icon: IconHome },
  {
    href: "/orders",
    labelKey: "nav.orders",
    permission: "orders.view" as PermissionCode,
    icon: IconClipboard,
  },
  {
    href: "/production",
    labelKey: "nav.shopShort",
    permission: "production.view" as PermissionCode,
    icon: IconFactory,
  },
  {
    href: "/warehouse",
    labelKey: "nav.warehouse",
    permission: "inventory.view" as PermissionCode,
    icon: IconWarehouse,
  },
  { href: "/more", labelKey: "nav.more", permission: null as PermissionCode | null, icon: IconMenu },
];

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
  const t = createT(locale);
  return (
    <nav className="fixed inset-x-0 bottom-0 z-20 flex border-t border-[var(--line)] bg-[var(--surface)] print:hidden lg:hidden">
      {TABS.filter((tab) => !tab.permission || hasPermission(permissions, roleCode, tab.permission)).map(
        (tab) => {
          const onMain =
            path === "/" ||
            path.startsWith("/orders") ||
            path.startsWith("/production") ||
            path.startsWith("/warehouse");
          const active =
            tab.href === "/"
              ? path === "/"
              : tab.href === "/more"
                ? !onMain
                : path.startsWith(tab.href);
          const Icon = tab.icon;
          return (
            <Link
              key={tab.href}
              href={tab.href}
              className={`flex flex-1 flex-col items-center gap-0.5 py-1.5 text-[10px] ${
                active ? "font-semibold text-[var(--foreground)]" : "text-[var(--muted)]"
              }`}
            >
              <Icon size={17} />
              <span>{t(tab.labelKey)}</span>
            </Link>
          );
        },
      )}
    </nav>
  );
}
