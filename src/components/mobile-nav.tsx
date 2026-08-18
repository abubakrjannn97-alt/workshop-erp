"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import type { PermissionCode } from "@core/rbac/permissions";
import { hasPermission } from "@core/rbac/permissions";
import type { Locale } from "@/lib/i18n";
import { createT } from "@/lib/i18n";
import { IconMenu } from "@/components/icons";

type Leaf = { href: string; labelKey: string; permission: PermissionCode | null; tour: string };

const GROUPS: { id: string; labelKey: string | null; items: Leaf[] }[] = [
  {
    id: "home",
    labelKey: null,
    items: [{ href: "/", labelKey: "nav.home", permission: null, tour: "nav-home" }],
  },
  {
    id: "sales",
    labelKey: "nav.sales",
    items: [
      { href: "/sales", labelKey: "home.title", permission: "orders.view", tour: "nav-sales" },
      { href: "/crm", labelKey: "nav.crm", permission: "crm.view", tour: "nav-crm" },
      { href: "/orders", labelKey: "nav.orders", permission: "orders.view", tour: "nav-orders" },
    ],
  },
  {
    id: "shop",
    labelKey: "nav.shopShort",
    items: [
      { href: "/products", labelKey: "nav.products", permission: "products.view", tour: "nav-products" },
      { href: "/production", labelKey: "nav.production", permission: "production.view", tour: "nav-production" },
      { href: "/warehouse", labelKey: "nav.warehouse", permission: "inventory.view", tour: "nav-warehouse" },
    ],
  },
  {
    id: "money",
    labelKey: "nav.accounts",
    items: [
      { href: "/purchasing", labelKey: "nav.purchasing", permission: "purchasing.view", tour: "nav-purchasing" },
      { href: "/finance", labelKey: "nav.finance", permission: "finance.view", tour: "nav-finance" },
    ],
  },
  {
    id: "company",
    labelKey: "nav.org",
    items: [
      { href: "/employees", labelKey: "nav.employees", permission: "users.view", tour: "nav-employees" },
      { href: "/analytics", labelKey: "nav.analytics", permission: "analytics.view", tour: "nav-analytics" },
      { href: "/settings", labelKey: "nav.settings", permission: "settings.view", tour: "nav-settings" },
      { href: "/help", labelKey: "nav.help", permission: null, tour: "nav-help" },
    ],
  },
];

export function MobileNav({
  permissions,
  roleCode,
  locale,
}: {
  permissions: string[];
  roleCode: string;
  locale: Locale;
}) {
  const [open, setOpen] = useState(false);
  const path = usePathname();
  const t = createT(locale);

  const groups = GROUPS.map((g) => ({
    ...g,
    items: g.items.filter((item) => !item.permission || hasPermission(permissions, roleCode, item.permission)),
  })).filter((g) => g.items.length > 0);

  return (
    <div className="lg:hidden">
      <button
        type="button"
        className="inline-flex h-7 w-7 items-center justify-center rounded-lg border border-[var(--color-border)] bg-white text-[var(--color-text-secondary)]"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-label={t("nav.menu")}
      >
        <IconMenu size={14} />
      </button>
      {open ? (
        <div
          className="absolute inset-x-0 top-14 z-40 border-b border-[#E5E7EB] bg-white p-3 shadow-sm"
          role="dialog"
          aria-label={t("nav.menu")}
        >
          <nav className="max-h-[60vh] overflow-y-auto">
            {groups.map((group) => (
              <div key={group.id} className="mt-0.5 first:mt-0">
                {group.labelKey ? (
                  <p className="px-3 pt-2 text-[10px] font-semibold leading-none text-[var(--nav-cat)]">
                    {t(group.labelKey)}
                  </p>
                ) : null}
                {group.items.map((item) => {
                  const active = item.href === "/" ? path === "/" : path.startsWith(item.href);
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      prefetch
                      data-tour={item.tour}
                      onClick={() => setOpen(false)}
                      aria-current={active ? "page" : undefined}
                      className={`block rounded px-3 py-1 text-[13px] leading-tight focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--titan-soft)] ${
                        active
                          ? "bg-[var(--titan-active)] font-medium"
                          : "text-[var(--text-muted)] hover:bg-[var(--surface-muted)]"
                      }`}
                    >
                      {t(item.labelKey)}
                    </Link>
                  );
                })}
              </div>
            ))}
          </nav>
        </div>
      ) : null}
    </div>
  );
}
