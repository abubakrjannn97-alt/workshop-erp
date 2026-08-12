import Link from "next/link";
import { logoutAction } from "@/app/actions/auth";
import type { PermissionCode } from "@/lib/permissions";
import { hasPermission } from "@/lib/permissions";
import { MobileNav } from "@/components/mobile-nav";
import { BottomNav } from "@/components/bottom-nav";

const NAV = [
  { href: "/", label: "Главная", permission: null },
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

type Props = {
  companyName: string;
  userName: string;
  roleName: string;
  roleCode: string;
  permissions: string[];
  unread?: number;
  children: React.ReactNode;
};

export function AppShell({
  companyName,
  userName,
  roleName,
  roleCode,
  permissions,
  unread = 0,
  children,
}: Props) {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <aside className="fixed inset-y-0 left-0 hidden w-60 border-r border-[var(--line)] bg-white print:hidden lg:flex lg:flex-col">
        <div className="border-b border-[var(--line)] px-5 py-4">
          <p className="text-[11px] font-medium uppercase tracking-[0.14em] text-[var(--muted)]">
            Цех
          </p>
          <p className="mt-1 truncate text-sm font-semibold">{companyName}</p>
          <form action="/search" className="mt-3">
            <input
              name="q"
              placeholder="1054, клиент…"
              className="w-full rounded-lg border border-slate-200 px-2 py-1.5 text-xs"
            />
          </form>
        </div>
        <nav className="flex-1 space-y-0.5 overflow-y-auto p-3">
          {NAV.map((item) => {
            if (item.permission && !hasPermission(permissions, roleCode, item.permission)) {
              return null;
            }
            return (
              <Link
                key={item.href}
                href={item.href}
                className="flex items-center justify-between rounded-lg px-3 py-2 text-sm text-slate-700 hover:bg-slate-50"
              >
                <span>{item.label}</span>
                {item.later ? (
                  <span className="text-[10px] uppercase tracking-wide text-slate-400">позже</span>
                ) : null}
              </Link>
            );
          })}
        </nav>
        <div className="border-t border-[var(--line)] p-4">
          <p className="truncate text-sm font-medium">{userName}</p>
          <p className="text-xs text-[var(--muted)]">{roleName}</p>
          {unread > 0 ? (
            <Link href="/notifications" className="mt-2 block text-xs font-medium text-teal-800">
              Уведомления ({unread})
            </Link>
          ) : (
            <Link href="/notifications" className="mt-2 block text-xs text-slate-500">
              Уведомления
            </Link>
          )}
          <Link href="/settings/approvals" className="mt-1 block text-xs text-slate-500">
            Согласования
          </Link>
          <form action={logoutAction} className="mt-3">
            <button
              type="submit"
              className="text-xs font-medium text-teal-800 hover:underline"
            >
              Выйти
            </button>
          </form>
        </div>
      </aside>
      <div className="lg:pl-60">
        <header className="sticky top-0 z-10 flex items-center justify-between gap-3 border-b border-[var(--line)] bg-white/90 px-4 py-3 backdrop-blur lg:hidden print:hidden">
          <p className="text-sm font-semibold">{companyName}</p>
          <div className="flex items-center gap-2">
            <p className="text-xs text-[var(--muted)]">{userName}</p>
            <MobileNav permissions={permissions} roleCode={roleCode} />
          </div>
        </header>
        <main className="mx-auto max-w-6xl px-4 py-6 pb-20 lg:px-8 lg:pb-6">{children}</main>
      </div>
      <BottomNav permissions={permissions} roleCode={roleCode} />
    </div>
  );
}
