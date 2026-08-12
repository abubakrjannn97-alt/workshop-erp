"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { logoutAction } from "@/app/actions/auth";
import type { PermissionCode } from "@/lib/permissions";
import { hasPermission } from "@/lib/permissions";
import { LanguageSwitcher } from "@/components/language-switcher";
import type { Locale } from "@/lib/i18n";
import { createT } from "@/lib/i18n";
import {
  IconHome,
  IconBox,
  IconCart,
  IconUsers,
  IconClipboard,
  IconFactory,
  IconWarehouse,
  IconTruck,
  IconWallet,
  IconUser,
  IconChart,
  IconSettings,
  IconBell,
  IconChevron,
  IconLogout,
  IconSearch,
} from "@/components/icons";

type NavItem = {
  href: string;
  labelKey: string;
  permission: PermissionCode | null;
  icon: React.ComponentType<{ size?: number; className?: string }>;
};

const NAV: NavItem[] = [
  { href: "/", labelKey: "nav.home", permission: null, icon: IconHome },
  { href: "/products", labelKey: "nav.products", permission: "products.view", icon: IconBox },
  { href: "/sales", labelKey: "nav.sales", permission: "orders.view", icon: IconCart },
  { href: "/crm", labelKey: "nav.crm", permission: "crm.view", icon: IconUsers },
  { href: "/orders", labelKey: "nav.orders", permission: "orders.view", icon: IconClipboard },
  { href: "/production", labelKey: "nav.production", permission: "production.view", icon: IconFactory },
  { href: "/warehouse", labelKey: "nav.warehouse", permission: "inventory.view", icon: IconWarehouse },
  { href: "/purchasing", labelKey: "nav.purchasing", permission: "purchasing.view", icon: IconTruck },
  { href: "/finance", labelKey: "nav.finance", permission: "finance.view", icon: IconWallet },
  { href: "/employees", labelKey: "nav.employees", permission: "users.view", icon: IconUser },
  { href: "/analytics", labelKey: "nav.analytics", permission: "analytics.view", icon: IconChart },
  { href: "/settings", labelKey: "nav.settings", permission: "settings.view", icon: IconSettings },
];

const STORAGE_KEY = "workshop_sidebar_collapsed";
const COLLAPSE_EVENT = "workshop:sidebar-collapse";

function readCollapsed(): boolean {
  try {
    return localStorage.getItem(STORAGE_KEY) === "1";
  } catch {
    return false;
  }
}

function writeCollapsed(next: boolean) {
  try {
    localStorage.setItem(STORAGE_KEY, next ? "1" : "0");
    window.dispatchEvent(new CustomEvent(COLLAPSE_EVENT, { detail: next }));
  } catch {
    /* ignore */
  }
}

export function Sidebar({
  companyName,
  userName,
  permissions,
  roleCode,
  unread,
  locale,
}: {
  companyName: string;
  userName: string;
  permissions: string[];
  roleCode: string;
  unread: number;
  locale: Locale;
}) {
  const path = usePathname();
  const t = createT(locale);
  const [collapsed, setCollapsed] = useState(false);

  useEffect(() => {
    setCollapsed(readCollapsed());
    function onCollapse(e: Event) {
      const detail = (e as CustomEvent<boolean>).detail;
      setCollapsed(typeof detail === "boolean" ? detail : readCollapsed());
    }
    window.addEventListener(COLLAPSE_EVENT, onCollapse);
    return () => window.removeEventListener(COLLAPSE_EVENT, onCollapse);
  }, []);

  function toggle() {
    setCollapsed((v) => {
      const next = !v;
      writeCollapsed(next);
      return next;
    });
  }

  const items = NAV.filter(
    (item) => !item.permission || hasPermission(permissions, roleCode, item.permission),
  );

  return (
    <aside
      className={`fixed inset-y-0 left-0 z-30 hidden flex-col border-r border-[var(--line)] bg-[var(--surface)] print:hidden lg:flex ${
        collapsed ? "w-[var(--sidebar-collapsed)]" : "w-[var(--sidebar-w)]"
      }`}
      style={{ transition: "width var(--transition)" }}
    >
      <div className={`border-b border-[var(--line)] ${collapsed ? "px-2 py-3" : "px-3 py-3"}`}>
        {!collapsed ? (
          <>
            <p className="truncate text-[13px] font-semibold text-[var(--foreground)]">{companyName}</p>
            <form action="/search" className="relative mt-2">
              <IconSearch
                size={14}
                className="pointer-events-none absolute left-2 top-1/2 -translate-y-1/2 text-[var(--muted)]"
              />
              <input
                name="q"
                placeholder={t("nav.search")}
                className="ui-input h-8 pl-7 text-xs"
              />
            </form>
          </>
        ) : (
          <p className="text-center text-[10px] font-semibold uppercase tracking-wide text-[var(--muted)]">
            {t("app.shop")}
          </p>
        )}
      </div>

      <nav className="flex-1 space-y-0.5 overflow-y-auto px-2 py-2">
        {items.map((item) => {
          const active = item.href === "/" ? path === "/" : path.startsWith(item.href);
          const Icon = item.icon;
          const label = t(item.labelKey);
          return (
            <Link
              key={item.href}
              href={item.href}
              title={collapsed ? label : undefined}
              className={`flex items-center gap-2 rounded-[var(--radius-sm)] px-2 py-1.5 text-[13px] transition-colors ${
                active
                  ? "bg-[var(--titan-active)] font-medium text-[var(--foreground)]"
                  : "text-[var(--text-secondary)] hover:bg-[var(--bg-secondary)] hover:text-[var(--foreground)]"
              } ${collapsed ? "justify-center" : ""}`}
            >
              <Icon size={17} className="shrink-0" />
              {!collapsed ? <span className="truncate">{label}</span> : null}
            </Link>
          );
        })}
      </nav>

      <div className={`border-t border-[var(--line)] ${collapsed ? "px-1.5 py-2" : "px-3 py-2"}`}>
        {!collapsed ? (
          <div className="mb-2 flex items-center justify-between gap-2">
            <LanguageSwitcher locale={locale} />
            <button
              type="button"
              onClick={toggle}
              className="rounded-[var(--radius-sm)] p-1.5 text-[var(--muted)] hover:bg-[var(--bg-secondary)]"
              title={t("nav.collapse")}
              aria-label={t("nav.collapse")}
            >
              <IconChevron size={16} />
            </button>
          </div>
        ) : (
          <button
            type="button"
            onClick={toggle}
            className="mx-auto mb-2 flex rounded-[var(--radius-sm)] p-1.5 text-[var(--muted)] hover:bg-[var(--bg-secondary)]"
            title={t("nav.expand")}
            aria-label={t("nav.expand")}
          >
            <IconChevron size={16} className="rotate-180" />
          </button>
        )}

        {!collapsed ? (
          <p className="truncate text-xs font-medium text-[var(--foreground)]">{userName}</p>
        ) : null}

        <div className={`mt-1 flex ${collapsed ? "flex-col items-center gap-1" : "items-center gap-2"}`}>
          <Link
            href="/notifications"
            title={t("nav.notifications")}
            className="relative rounded-[var(--radius-sm)] p-1.5 text-[var(--text-secondary)] hover:bg-[var(--bg-secondary)]"
            aria-label={t("nav.notifications")}
          >
            <IconBell size={16} />
            {unread > 0 ? (
              <span className="absolute right-0.5 top-0.5 h-1.5 w-1.5 rounded-full bg-[var(--danger)]" />
            ) : null}
          </Link>
          {!collapsed ? (
            <Link
              href="/settings/approvals"
              className="text-[11px] text-[var(--muted)] hover:text-[var(--foreground)]"
            >
              {t("nav.approvals")}
            </Link>
          ) : null}
          <form action={logoutAction} className={collapsed ? "" : "ml-auto"}>
            <button
              type="submit"
              title={t("nav.logout")}
              aria-label={t("nav.logout")}
              className="rounded-[var(--radius-sm)] p-1.5 text-[var(--text-secondary)] hover:bg-[var(--bg-secondary)]"
            >
              <IconLogout size={16} />
            </button>
          </form>
        </div>
      </div>
    </aside>
  );
}

export function useSidebarOffsetClass() {
  const [collapsed, setCollapsed] = useState(false);
  useEffect(() => {
    setCollapsed(readCollapsed());
    function onCollapse(e: Event) {
      const detail = (e as CustomEvent<boolean>).detail;
      setCollapsed(typeof detail === "boolean" ? detail : readCollapsed());
    }
    function onStorage() {
      setCollapsed(readCollapsed());
    }
    window.addEventListener(COLLAPSE_EVENT, onCollapse);
    window.addEventListener("storage", onStorage);
    return () => {
      window.removeEventListener(COLLAPSE_EVENT, onCollapse);
      window.removeEventListener("storage", onStorage);
    };
  }, []);
  return collapsed ? "lg:pl-[var(--sidebar-collapsed)]" : "lg:pl-[var(--sidebar-w)]";
}
