import { FormField } from "@/components/form-field";
import { getTranslator } from "@core/shared/i18n/locale";
import { redirect } from "next/navigation";
import { prisma } from "@core/infrastructure/prisma";
import { requirePermission } from "@core/auth/authz";
import { createProduct } from "@/app/actions/products";
import { CatalogNav } from "@/components/catalog-nav";
import { AppSelect } from "@/components/app-select";
import { getDomainConfig } from "@core/config/domain-config";
import styles from "@/styles/premium.module.css";
import catalogStyles from "@/components/catalog-form.module.css";

export default async function NewProductPage() {
  const { t, locale } = await getTranslator();
  await requirePermission("products.manage");
  const [units, domainConfig] = await Promise.all([
    prisma.unit.findMany({ where: { archivedAt: null, isActive: true }, orderBy: { name: "asc" } }),
    getDomainConfig(),
  ]);
  const defaultSaleUnitId = units.find((u) => u.code === domainConfig.product.defaultSaleUnit)?.id;
  const defaultOutputUnitId = units.find((u) => u.code === domainConfig.product.defaultOutputUnit)?.id;

  async function action(formData: FormData) {
    "use server";
    const result = await createProduct(formData);
    if (result.ok && result.id) redirect(`/products/${result.id}`);
  }

  return (
    <div className={`${styles.page} ${catalogStyles.pageTight}`}>
      <header className={styles.header}>
        <div className={styles.headerText}>
          <h1 className={styles.title}>{t("products.newTitle")}</h1>
        </div>
      </header>
      <CatalogNav current="products" locale={locale} />
      <section className={styles.section} data-tour="products-form">
        <div className={`${styles.sectionHead} ${catalogStyles.sectionTightHead}`}>
          <h2 className={styles.sectionTitle}>{t("products.newTitle")}</h2>
        </div>
        <div className={`${styles.sectionBody} ${catalogStyles.sectionTightBody}`}>
          <form action={action} className={catalogStyles.formGrid}>
            <FormField label={t("common.name")} required>
              <input name="name" required className="ui-input" />
            </FormField>
            <FormField label={t("common.category")}>
              <input name="category" defaultValue={domainConfig.product.defaultCategory} className="ui-input" />
            </FormField>
            <FormField label={t("products.saleUnit")} required>
              <AppSelect
                name="saleUnitId"
                defaultValue={defaultSaleUnitId ?? units[0]?.id ?? ""}
                required
                options={units.map((u) => ({ value: u.id, label: `${u.name} (${u.symbol})` }))}
              />
            </FormField>
            <FormField label={t("products.fgUnit")} required>
              <AppSelect
                name="outputUnitId"
                defaultValue={defaultOutputUnitId ?? units[0]?.id ?? ""}
                required
                options={units.map((u) => ({ value: u.id, label: `${u.name} (${u.symbol})` }))}
              />
            </FormField>
            <FormField label={t("products.recipeBaseShort")}>
              <input name="recipeBaseQty" defaultValue="1" className="ui-input" />
            </FormField>
            <FormField label={t("products.outputBaseShort")}>
              <input
                name="outputPerBase"
                defaultValue={String(domainConfig.product.defaultOutputPerBase)}
                className="ui-input"
              />
            </FormField>
            <FormField label={t("products.salePrice")}>
              <input name="price" defaultValue="0" className="ui-input" inputMode="decimal" />
            </FormField>
            <FormField label={t("products.minPrice")}>
              <input name="minPrice" defaultValue="0" className="ui-input" inputMode="decimal" />
            </FormField>
            <button type="submit" className={`${catalogStyles.formFull} ui-btn-primary min-h-[44px]`}>
              {t("common.create")}
            </button>
          </form>
        </div>
      </section>
    </div>
  );
}
