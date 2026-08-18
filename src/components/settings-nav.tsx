import Link from "next/link";
import { createT, type Locale } from "@core/shared/i18n/i18n";

export type SettingsNavId =
  | "business"
  | "units"
  | "users"
  | "roles"
  | "approvals"
  | "audit"
  | "backups";

export function SettingsNav({ current, locale }: { current: SettingsNavId; locale: Locale }) {
  const t = createT(locale);
  const items = [
    { href: "/settings", id: "business" as const, label: t("set.business") },
    { href: "/settings/units", id: "units" as const, label: t("set.units") },
    { href: "/settings/users", id: "users" as const, label: t("set.users") },
    { href: "/settings/roles", id: "roles" as const, label: t("set.roles") },
    { href: "/settings/approvals", id: "approvals" as const, label: t("set.approvals") },
    { href: "/settings/audit", id: "audit" as const, label: t("set.audit") },
    { href: "/settings/backups", id: "backups" as const, label: t("set.backupsTitle") },
  ];

  return (
    <div className="no-scrollbar flex flex-wrap gap-1.5 overflow-x-auto pb-1" data-tour="set-nav">
      {items.map((item) => (
        <Link
          key={item.id}
          href={item.href}
          prefetch
          className={`shrink-0 ${current === item.id ? "ui-chip-on" : "ui-chip"}`}
        >
          {item.label}
        </Link>
      ))}
      <Link href="/employees" className="ui-chip shrink-0">
        {t("page.employees")}
      </Link>
      <Link href="/products" className="ui-chip shrink-0">
        {t("page.products")}
      </Link>
    </div>
  );
}
