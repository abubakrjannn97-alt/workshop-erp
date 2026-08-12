import Link from "next/link";
import { requireSession } from "@/lib/authz";
import { hasPermission } from "@/lib/authz";
import type { PermissionCode } from "@/lib/permissions";

const ITEMS: { href: string; label: string; permission: PermissionCode | null }[] = [
  { href: "/sales", label: "Продажи", permission: "orders.view" },
  { href: "/crm", label: "CRM", permission: "crm.view" },
  { href: "/purchasing", label: "Закупки", permission: "purchasing.view" },
  { href: "/finance", label: "Финансы", permission: "finance.view" },
  { href: "/employees", label: "Сотрудники", permission: "users.view" },
  { href: "/analytics", label: "Аналитика", permission: "analytics.view" },
  { href: "/notifications", label: "Уведомления", permission: null },
  { href: "/settings", label: "Настройки", permission: "settings.view" },
  { href: "/search", label: "Поиск", permission: null },
];

export default async function MorePage() {
  const session = await requireSession();
  return (
    <div className="space-y-4 pb-16">
      <h1 className="text-2xl font-semibold">Ещё</h1>
      <ul className="divide-y divide-slate-100 rounded-2xl border border-[var(--line)] bg-white">
        {ITEMS.filter(
          (i) => !i.permission || hasPermission(session.user.permissions, session.user.roleCode, i.permission),
        ).map((i) => (
          <li key={i.href}>
            <Link href={i.href} className="block px-5 py-3 text-sm hover:bg-slate-50">
              {i.label}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
