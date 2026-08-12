import Link from "next/link";
import { requireSession } from "@/lib/authz";
import { hasPermission } from "@/lib/authz";
import type { PermissionCode } from "@/lib/permissions";
import { getTranslator } from "@/lib/locale";

const ITEMS: { href: string; labelKey: string; permission: PermissionCode | null }[] = [
  { href: "/sales", labelKey: "nav.sales", permission: "orders.view" },
  { href: "/crm", labelKey: "nav.crm", permission: "crm.view" },
  { href: "/purchasing", labelKey: "nav.purchasing", permission: "purchasing.view" },
  { href: "/finance", labelKey: "nav.finance", permission: "finance.view" },
  { href: "/employees", labelKey: "nav.employees", permission: "users.view" },
  { href: "/analytics", labelKey: "nav.analytics", permission: "analytics.view" },
  { href: "/notifications", labelKey: "nav.notifications", permission: null },
  { href: "/settings", labelKey: "nav.settings", permission: "settings.view" },
  { href: "/search", labelKey: "nav.search", permission: null },
];

export default async function MorePage() {
  const session = await requireSession();
  const { t } = await getTranslator();
  return (
    <div className="mx-auto max-w-lg space-y-3 pb-16">
      <h1 className="page-title">{t("nav.more")}</h1>
      <ul className="ui-card divide-y divide-[var(--line)] overflow-hidden">
        {ITEMS.filter(
          (i) => !i.permission || hasPermission(session.user.permissions, session.user.roleCode, i.permission),
        ).map((i) => (
          <li key={i.href}>
            <Link
              href={i.href}
              className="block px-4 py-2.5 text-[13px] text-[var(--foreground)] hover:bg-[var(--bg-secondary)]"
            >
              {t(i.labelKey)}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
