import Link from "next/link";
import { createT, type Locale } from "@core/shared/i18n/i18n";

export function CatalogNav({
  current,
  locale,
}: {
  current: "products" | "materials";
  locale: Locale;
}) {
  const t = createT(locale);
  return (
    <div className="flex flex-wrap gap-1.5">
      <Link href="/products" className={current === "products" ? "ui-chip-on" : "ui-chip"}>
        {t("catalog.products")}
      </Link>
      <Link href="/materials" className={current === "materials" ? "ui-chip-on" : "ui-chip"}>
        {t("catalog.materials")}
      </Link>
    </div>
  );
}
