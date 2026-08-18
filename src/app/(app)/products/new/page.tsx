import { PageHeader } from "@/components/page-header";
import { FormField } from "@/components/form-field";
import { getTranslator } from "@core/shared/i18n/locale";
import { redirect } from "next/navigation";
import { prisma } from "@core/infrastructure/prisma";
import { requirePermission } from "@core/auth/authz";
import { createProduct } from "@/app/actions/products";
import { CatalogNav } from "@/components/catalog-nav";
import { getDomainConfig } from "@core/config/domain-config";

export default async function NewProductPage() {
  const { t, locale } = await getTranslator();
  await requirePermission("products.manage");
  const [units, domainConfig] = await Promise.all([
    prisma.unit.findMany({
      where: { archivedAt: null, isActive: true },
      orderBy: { name: "asc" },
    }),
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
    <div className="page-stack">
      <PageHeader title={t("products.newTitle")} />
      <CatalogNav current="products" locale={locale} />
      <form action={action} className="ui-card max-w-xl space-y-4 p-4">
        <FormField label={t("common.name")} required>
          <input name="name" required className="ui-input" />
        </FormField>
        <FormField label={t("common.category")}>
          <input
            name="category"
            defaultValue={domainConfig.product.defaultCategory}
            className="ui-input"
          />
        </FormField>
        <FormField label={t("products.saleUnit")} required>
          <select name="saleUnitId" defaultValue={defaultSaleUnitId} className="ui-input" required>
            {units.map((u) => (
              <option key={u.id} value={u.id}>
                {u.name} ({u.symbol})
              </option>
            ))}
          </select>
        </FormField>
        <FormField label={t("products.fgUnit")} required>
          <select name="outputUnitId" defaultValue={defaultOutputUnitId} className="ui-input" required>
            {units.map((u) => (
              <option key={u.id} value={u.id}>
                {u.name} ({u.symbol})
              </option>
            ))}
          </select>
        </FormField>
        <FormField label={t("products.recipeBase")}>
          <input name="recipeBaseQty" defaultValue="1" className="ui-input" />
        </FormField>
        <FormField label={t("products.outputBase")}>
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
        <button type="submit" className="ui-btn-primary w-full sm:w-auto">
          {t("common.create")}
        </button>
      </form>
    </div>
  );
}
