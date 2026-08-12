"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { PermissionCode } from "@/lib/permissions";
import { hasPermission } from "@/lib/permissions";

const TABS = [
  { href: "/", label: "Главная", permission: null as PermissionCode | null },
  { href: "/orders", label: "Заказы", permission: "orders.view" as PermissionCode },
  { href: "/production", label: "Цех", permission: "production.view" as PermissionCode },
  { href: "/warehouse", label: "Склад", permission: "inventory.view" as PermissionCode },
  { href: "/more", label: "Ещё", permission: null as PermissionCode | null },
];

export function BottomNav({
  permissions,
  roleCode,
}: {
  permissions: string[];
  roleCode: string;
}) {
  const path = usePathname();
  return (
    <nav className="fixed inset-x-0 bottom-0 z-20 flex border-t border-[var(--line)] bg-white print:hidden lg:hidden">
      {TABS.filter((t) => !t.permission || hasPermission(permissions, roleCode, t.permission)).map((t) => {
        const onMain =
          path === "/" ||
          path.startsWith("/orders") ||
          path.startsWith("/production") ||
          path.startsWith("/warehouse");
        const active =
          t.href === "/"
            ? path === "/"
            : t.href === "/more"
              ? !onMain
              : path.startsWith(t.href);
        return (
          <Link
            key={t.href}
            href={t.href}
            className={`flex-1 py-2 text-center text-[11px] ${active ? "font-semibold text-teal-800" : "text-slate-500"}`}
          >
            {t.label}
          </Link>
        );
      })}
    </nav>
  );
}
