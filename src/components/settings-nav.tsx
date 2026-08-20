import { createT, type Locale } from "@core/shared/i18n/i18n";
import { Segmented } from "@/components/segmented";

export type SettingsNavId = "business" | "units" | "access" | "backups";

export function SettingsNav({ current, locale }: { current: SettingsNavId; locale: Locale }) {
  const t = createT(locale);
  const items = [
    { href: "/settings", id: "business" as const, label: t("set.business") },
    { href: "/settings/units", id: "units" as const, label: t("set.units") },
    { href: "/settings/users", id: "access" as const, label: t("set.access") },
    { href: "/settings/backups", id: "backups" as const, label: t("set.backupsTitle") },
  ];

  return (
    <Segmented
      aria-label={t("page.settings")}
      className="w-full"
      tour="set-nav"
      items={items.map((item) => ({
        href: item.href,
        label: item.label,
        active: current === item.id,
      }))}
    />
  );
}
