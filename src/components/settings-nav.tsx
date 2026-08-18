import { createT, type Locale } from "@core/shared/i18n/i18n";
import { Segmented } from "@/components/segmented";

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
    { href: "/employees", id: null, label: t("page.employees") },
    { href: "/products", id: null, label: t("page.products") },
  ];

  return (
    <Segmented
      aria-label={t("page.settings")}
      className="w-full"
      tour="set-nav"
      items={items.map((item) => ({
        href: item.href,
        label: item.label,
        active: item.id !== null && current === item.id,
      }))}
    />
  );
}
