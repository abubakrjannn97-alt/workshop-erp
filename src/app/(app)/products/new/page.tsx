import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/authz";
import { createProduct } from "@/app/actions/products";
import { CatalogNav } from "@/components/catalog-nav";

export default async function NewProductPage() {
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
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">Новое изделие</h1>
      <CatalogNav current="products" />
      <form action={action} className="max-w-xl space-y-3 rounded-2xl border border-[var(--line)] bg-white p-6">
        <Field name="name" label="Название" required />
        <Field name="category" label="Категория" defaultValue="Фасад" />
        <Field name="photoUrl" label="Фотография (URL)" />
        <label className="block text-sm">
          <span className="font-medium">Единица продажи</span>
          <select
            name="saleUnitId"
            defaultValue={units.find((u) => u.code === "M2")?.id}
            className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
          >
            {units.map((u) => (
              <option key={u.id} value={u.id}>
                {u.name} ({u.symbol})
              </option>
            ))}
          </select>
        </label>
        <label className="block text-sm">
          <span className="font-medium">Единица готовой продукции</span>
          <select
            name="outputUnitId"
            defaultValue={units.find((u) => u.code === "PCS")?.id}
            className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
          >
            {units.map((u) => (
              <option key={u.id} value={u.id}>
                {u.name} ({u.symbol})
              </option>
            ))}
          </select>
        </label>
        <Field name="recipeBaseQty" label="База рецептуры (обычно 1 м²)" defaultValue="1" />
        <Field name="outputPerBase" label="Выход с базы (напр. 10 плиток / 1 м²)" defaultValue="10" />
        <Field name="price" label="Цена продажи, сомони" defaultValue="0" />
        <Field name="minPrice" label="Минимальная цена" defaultValue="0" />
        <button className="rounded-lg bg-[var(--titan-dark)] px-4 py-2 text-sm font-medium text-white">Создать</button>
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
        className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
      />
    </label>
  );
}
