import Link from "next/link";
import { createT, type Locale } from "@core/shared/i18n/i18n";

export function WarehouseNav({
  current,
  locale,
}: {
  current: "raw" | "fg" | "moves" | "inventory";
  locale: Locale;
}) {
  const t = createT(locale);
  const items = [
    { href: "/warehouse", id: "raw", labelKey: "whNav.raw" },
    { href: "/warehouse/finished", id: "fg", labelKey: "whNav.fg" },
    { href: "/warehouse/movements", id: "moves", labelKey: "whNav.moves" },
    { href: "/warehouse/inventory", id: "inventory", labelKey: "whNav.inventory" },
  ] as const;
  return (
    <div className="no-scrollbar flex gap-1.5 overflow-x-auto pb-1">
      {items.map((item) => (
        <Link
          key={item.id}
          href={item.href}
          prefetch
          className={`shrink-0 ${current === item.id ? "ui-chip-on" : "ui-chip"}`}
        >
          {t(item.labelKey)}
        </Link>
      ))}
    </div>
  );
}
