"use client";

import Link from "next/link";
import { useState } from "react";
import type { PermissionCode } from "@/lib/permissions";
import { hasPermission } from "@/lib/permissions";

const NAV = [
  { href: "/", label: "Главная", permission: null as PermissionCode | null },
  { href: "/products", label: "Продукция", permission: "products.view" as PermissionCode },
  { href: "/sales", label: "Продажи", permission: "orders.view" as PermissionCode },
  { href: "/crm", label: "CRM", permission: "crm.view" as PermissionCode },
  { href: "/orders", label: "Заказы", permission: "orders.view" as PermissionCode },
  { href: "/production", label: "Производство", permission: "production.view" as PermissionCode },
  { href: "/warehouse", label: "Склад", permission: "inventory.view" as PermissionCode },
  { href: "/purchasing", label: "Закупки", permission: "purchasing.view" as PermissionCode },
  { href: "/finance", label: "Финансы", permission: "finance.view" as PermissionCode },
  { href: "/employees", label: "Сотрудники", permission: "users.view" as PermissionCode },
  { href: "/analytics", label: "Аналитика", permission: "analytics.view" as PermissionCode },
  { href: "/settings", label: "Настройки", permission: "settings.view" as PermissionCode },
];

export function MobileNav({
  permissions,
  roleCode,
}: {
  permissions: string[];
  roleCode: string;
}) {
  const [open, setOpen] = useState(false);
  return (
    <div className="lg:hidden">
      <button
        type="button"
        className="rounded-lg border border-slate-200 px-2 py-1 text-xs"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
      >
        Меню
      </button>
      {open ? (
        <nav className="absolute inset-x-0 top-12 z-20 border-b border-[var(--line)] bg-white p-3 shadow-sm">
          <form action="/search" className="mb-2">
            <input
              name="q"
              placeholder="1054, клиент…"
              className="w-full rounded-lg border border-slate-200 px-2 py-2 text-sm"
            />
          </form>
          {NAV.filter(
            (item) => !item.permission || hasPermission(permissions, roleCode, item.permission),
          ).map((item) => (
            <Link
              key={item.href}
              href={item.href}
              onClick={() => setOpen(false)}
              className="block rounded-lg px-3 py-2 text-sm hover:bg-slate-50"
            >
              {item.label}
            </Link>
          ))}
        </nav>
      ) : null}
    </div>
  );
}
