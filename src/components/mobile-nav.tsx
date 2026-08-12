"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import type { PermissionCode } from "@/lib/permissions";
import { hasPermission } from "@/lib/permissions";
import type { Locale } from "@/lib/i18n";
import { createT } from "@/lib/i18n";
import { LanguageSwitcher } from "@/components/language-switcher";
import { IconMenu, IconSearch } from "@/components/icons";

const NAV = [
  { href: "/", labelKey: "nav.home", permission: null as PermissionCode | null },
  { href: "/products", labelKey: "nav.products", permission: "products.view" as PermissionCode },
  { href: "/sales", labelKey: "nav.sales", permission: "orders.view" as PermissionCode },
  { href: "/crm", labelKey: "nav.crm", permission: "crm.view" as PermissionCode },
  { href: "/orders", labelKey: "nav.orders", permission: "orders.view" as PermissionCode },
  { href: "/production", labelKey: "nav.production", permission: "production.view" as PermissionCode },
  { href: "/warehouse", labelKey: "nav.warehouse", permission: "inventory.view" as PermissionCode },
  { href: "/purchasing", labelKey: "nav.purchasing", permission: "purchasing.view" as PermissionCode },
  { href: "/finance", labelKey: "nav.finance", permission: "finance.view" as PermissionCode },
  { href: "/employees", labelKey: "nav.employees", permission: "users.view" as PermissionCode },
  { href: "/analytics", labelKey: "nav.analytics", permission: "analytics.view" as PermissionCode },
  { href: "/settings", labelKey: "nav.settings", permission: "settings.view" as PermissionCode },
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

  return (
    <div className="lg:hidden">
      <button
        type="button"
        className="rounded-[var(--radius-sm)] border border-[var(--line)] p-1.5 text-[var(--foreground)]"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-label={t("nav.menu")}
      >
        <IconMenu size={18} />
      </button>
      {open ? (
        <div className="absolute inset-x-0 top-12 z-40 border-b border-[var(--line)] bg-[var(--surface)] p-3 shadow-sm">
          <div className="mb-2 flex items-center justify-between">
            <LanguageSwitcher locale={locale} />
          </div>
          <form action="/search" className="relative mb-2">
            <IconSearch
              size={14}
              className="pointer-events-none absolute left-2 top-1/2 -translate-y-1/2 text-[var(--muted)]"
            />
            <input name="q" placeholder={t("nav.search")} className="ui-input h-9 pl-7 text-sm" />
          </form>
          <nav className="max-h-[60vh] space-y-0.5 overflow-y-auto">
            {NAV.filter(
              (item) => !item.permission || hasPermission(permissions, roleCode, item.permission),
            ).map((item) => {
              const active = item.href === "/" ? path === "/" : path.startsWith(item.href);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setOpen(false)}
                  className={`block rounded-[var(--radius-sm)] px-3 py-2 text-sm ${
                    active
                      ? "bg-[var(--titan-active)] font-medium"
                      : "text-[var(--text-secondary)] hover:bg-[var(--bg-secondary)]"
                  }`}
                >
                  {t(item.labelKey)}
                </Link>
              );
            })}
          </nav>
        </div>
      ) : null}
    </div>
  );
}
