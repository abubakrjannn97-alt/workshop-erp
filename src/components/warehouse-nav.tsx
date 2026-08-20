import Link from "next/link";
import { createT, type Locale } from "@core/shared/i18n/i18n";
import { Segmented } from "@/components/segmented";

export function WarehouseNav({
  current,
  locale,
}: {
  current: "raw" | "fg";
  locale: Locale;
}) {
  const t = createT(locale);
  const items = [
    { href: "/warehouse", id: "raw" as const, labelKey: "whNav.raw" },
    { href: "/warehouse/finished", id: "fg" as const, labelKey: "whNav.fg" },
  ];
  return (
    <div className="wh-nav-center">
      <Segmented
        className="wh-nav-seg"
        aria-label={t("page.warehouse")}
        items={items.map((item) => ({
          href: item.href,
          label: t(item.labelKey),
          active: current === item.id,
        }))}
      />
    </div>
  );
}
