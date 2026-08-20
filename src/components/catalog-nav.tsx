import { createT, type Locale } from "@core/shared/i18n/i18n";
import { Segmented } from "@/components/segmented";
import catalogStyles from "./catalog-form.module.css";

export function CatalogNav({
  current,
  locale,
}: {
  current: "products" | "materials";
  locale: Locale;
}) {
  const t = createT(locale);
  return (
    <div className={catalogStyles.navCenter} data-tour="catalog-nav">
      <Segmented
        aria-label={t("catalog.products")}
        items={[
          { href: "/products", label: t("catalog.products"), active: current === "products" },
          { href: "/materials", label: t("catalog.materials"), active: current === "materials" },
        ]}
      />
    </div>
  );
}
