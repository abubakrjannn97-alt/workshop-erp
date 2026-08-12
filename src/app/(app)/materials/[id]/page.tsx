import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/authz";
import { updateMaterial } from "@/app/actions/materials";
import { CatalogNav } from "@/components/catalog-nav";
import { moneyDisplay, qtyDisplay } from "@/lib/decimal";
import { unitCost } from "@/lib/costing";

export default async function MaterialDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await requirePermission("materials.view");
  const canManage =
    session.user.roleCode === "owner" || session.user.permissions.includes("materials.manage");

  const [material, units] = await Promise.all([
    prisma.material.findUnique({
      where: { id },
      include: {
        storageUnit: true,
        purchaseUnit: true,
        prices: { orderBy: { validFrom: "desc" } },
      },
    }),
    prisma.unit.findMany({ where: { archivedAt: null, isActive: true }, orderBy: { name: "asc" } }),
  ]);
  if (!material || material.archivedAt) notFound();

  const cost = unitCost(material.packagePrice, material.packageWeight);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">{material.name}</h1>
        <p className="text-sm text-slate-600">
          Расчётная стоимость: {cost ? `${moneyDisplay(cost)} с / ${material.storageUnit.symbol}` : "не задана"}
        </p>
      </div>
      <CatalogNav current="materials" />

      <form action={updateMaterial} className="grid gap-3 rounded-2xl border border-[var(--line)] bg-white p-6 sm:grid-cols-2">
        <input type="hidden" name="id" value={material.id} />
        <Field name="name" label="Название" defaultValue={material.name} disabled={!canManage} />
        <Field name="category" label="Категория" defaultValue={material.category} disabled={!canManage} />
        <Field name="supplierName" label="Поставщик" defaultValue={material.supplierName ?? ""} disabled={!canManage} />
        <label className="block text-sm">
          <span className="font-medium">Единица хранения</span>
          <select name="storageUnitId" defaultValue={material.storageUnitId} disabled={!canManage} className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm">
            {units.map((u) => (
              <option key={u.id} value={u.id}>
                {u.name} ({u.symbol})
              </option>
            ))}
          </select>
        </label>
        <label className="block text-sm">
          <span className="font-medium">Единица закупки</span>
          <select name="purchaseUnitId" defaultValue={material.purchaseUnitId} disabled={!canManage} className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm">
            {units.map((u) => (
              <option key={u.id} value={u.id}>
                {u.name} ({u.symbol})
              </option>
            ))}
          </select>
        </label>
        <Field name="packageWeight" label="Вес / объём упаковки" defaultValue={material.packageWeight.toString()} disabled={!canManage} />
        <Field name="packagePrice" label="Цена упаковки, сомони" defaultValue={material.packagePrice.toString()} disabled={!canManage} />
        <Field name="minStock" label="Минимальный остаток" defaultValue={material.minStock.toString()} disabled={!canManage} />
        {canManage ? (
          <button className="sm:col-span-2 rounded-lg bg-teal-800 px-4 py-2 text-sm font-medium text-white">
            Сохранить. Прежняя цена останется в истории.
          </button>
        ) : null}
      </form>

      <section className="rounded-2xl border border-[var(--line)] bg-white p-6">
        <h2 className="text-sm font-semibold">История закупочных цен</h2>
        <ul className="mt-3 space-y-2 text-sm">
          {material.prices.map((row) => (
            <li key={row.id} className="flex justify-between gap-4">
              <span>
                {row.validFrom.toLocaleDateString("ru-RU")}
                {row.validTo ? ` — ${row.validTo.toLocaleDateString("ru-RU")}` : " — действует"} · упак.{" "}
                {qtyDisplay(row.packageWeight)} / {moneyDisplay(row.packagePrice)} с
              </span>
              <span className="font-mono text-xs">{moneyDisplay(row.unitPrice)} с / ед.</span>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}

function Field({
  name,
  label,
  defaultValue,
  disabled,
}: {
  name: string;
  label: string;
  defaultValue: string;
  disabled: boolean;
}) {
  return (
    <label className="block text-sm">
      <span className="font-medium">{label}</span>
      <input
        name={name}
        defaultValue={defaultValue}
        disabled={disabled}
        className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm disabled:bg-slate-50"
      />
    </label>
  );
}
