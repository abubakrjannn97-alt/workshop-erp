import { PageHeader } from "@/components/page-header";
import { getTranslator } from "@/lib/locale";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/authz";
import { createProduct } from "@/app/actions/products";
import { CatalogNav } from "@/components/catalog-nav";

export default async function NewProductPage() {
  const { t, locale } = await getTranslator();
  await requirePermission("products.manage");
  const units = await prisma.unit.findMany({
    where: { archivedAt: null, isActive: true },
    orderBy: { name: "asc" },
  });

  async function action(formData: FormData) {
    "use server";
    const result = await createProduct(formData);
    if (result.ok && result.id) redirect(`/products/${result.id}`);
  }

  return (
    <div className="page-stack">
      <PageHeader title={t("products.newTitle")} />
      <CatalogNav current="products" locale={locale} />
      <form action={action} className="max-w-xl space-y-3 ui-card">
        <Field name="name" label={t("common.name")} required />
        <Field name="category" label={t("common.category")} defaultValue={t("products.categoryDefault")} />
        <label className="block text-sm">
          <span className="font-medium">{t("products.saleUnit")}</span>
          <select
            name="saleUnitId"
            defaultValue={units.find((u) => u.code === "M2")?.id}
            className="mt-1 w-full rounded-lg border border-[var(--border)] px-3 py-2 text-sm"
          >
            {units.map((u) => (
              <option key={u.id} value={u.id}>
                {u.name} ({u.symbol})
              </option>
            ))}
          </select>
        </label>
        <label className="block text-sm">
          <span className="font-medium">{t("products.fgUnit")}</span>
          <select
            name="outputUnitId"
            defaultValue={units.find((u) => u.code === "PCS")?.id}
            className="mt-1 w-full rounded-lg border border-[var(--border)] px-3 py-2 text-sm"
          >
            {units.map((u) => (
              <option key={u.id} value={u.id}>
                {u.name} ({u.symbol})
              </option>
            ))}
          </select>
        </label>
        <Field name="recipeBaseQty" label={t("products.recipeBase")} defaultValue="1" />
        <Field name="outputPerBase" label={t("products.outputBase")} defaultValue="10" />
        <Field name="price" label={t("products.salePrice")} defaultValue="0" />
        <Field name="minPrice" label={t("products.minPrice")} defaultValue="0" />
        <button className="ui-btn-primary">{t("common.create")}</button>
      </form>
    </div>
  );
}

function Field({
  name,
  label,
  defaultValue,
  required,
}: {
  name: string;
  label: string;
  defaultValue?: string;
  required?: boolean;
}) {
  return (
    <label className="block text-sm">
      <span className="font-medium">{label}</span>
      <input
        name={name}
        defaultValue={defaultValue}
        required={required}
        className="mt-1 w-full rounded-lg border border-[var(--border)] px-3 py-2 text-sm"
      />
    </label>
  );
}
