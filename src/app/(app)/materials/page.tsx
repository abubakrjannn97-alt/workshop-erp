import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/authz";
import { CatalogNav } from "@/components/catalog-nav";
import { createMaterial, archiveMaterial } from "@/app/actions/materials";
import { moneyDisplay, qtyDisplay } from "@/lib/decimal";
import { unitCost } from "@/lib/costing";

export default async function MaterialsPage() {
  const session = await requirePermission("materials.view");
  const canManage =
    session.user.roleCode === "owner" || session.user.permissions.includes("materials.manage");

  const [materials, units] = await Promise.all([
    prisma.material.findMany({
      where: { archivedAt: null },
      include: { storageUnit: true, purchaseUnit: true },
      orderBy: { name: "asc" },
    }),
    prisma.unit.findMany({ where: { archivedAt: null, isActive: true }, orderBy: { name: "asc" } }),
  ]);

  return (
    <div className="space-y-6">
      <div>
        <p className="text-xs font-medium uppercase tracking-[0.16em] text-teal-800">PHASE 2</p>
        <h1 className="mt-1 text-2xl font-semibold">Сырьё и материалы</h1>
        <p className="mt-1 text-sm text-slate-600">
          Стоимость единицы = цена упаковки / вес упаковки. История цен не перезаписывается.
        </p>
      </div>
      <CatalogNav current="materials" />

      {canManage ? (
        <form action={createMaterial} className="grid gap-2 rounded-2xl border border-[var(--line)] bg-white p-5 sm:grid-cols-4">
          <input name="name" required placeholder="Название" className="rounded-lg border border-slate-200 px-3 py-2 text-sm" />
          <input name="category" required placeholder="Категория" className="rounded-lg border border-slate-200 px-3 py-2 text-sm" />
          <input name="supplierName" placeholder="Поставщик" className="rounded-lg border border-slate-200 px-3 py-2 text-sm" />
          <select name="storageUnitId" className="rounded-lg border border-slate-200 px-3 py-2 text-sm">
            {units.map((u) => (
              <option key={u.id} value={u.id}>
                Хранение: {u.symbol}
              </option>
            ))}
          </select>
          <select name="purchaseUnitId" className="rounded-lg border border-slate-200 px-3 py-2 text-sm">
            {units.map((u) => (
              <option key={u.id} value={u.id}>
                Закупка: {u.symbol}
              </option>
            ))}
          </select>
          <input name="packageWeight" required placeholder="Вес упаковки" className="rounded-lg border border-slate-200 px-3 py-2 text-sm" />
          <input name="packagePrice" required placeholder="Цена упаковки, с" className="rounded-lg border border-slate-200 px-3 py-2 text-sm" />
          <input name="minStock" placeholder="Мин. остаток" defaultValue="0" className="rounded-lg border border-slate-200 px-3 py-2 text-sm" />
          <button className="rounded-lg bg-teal-800 px-3 py-2 text-sm font-medium text-white sm:col-span-4">
            Добавить материал
          </button>
        </form>
      ) : null}

      <div className="overflow-hidden rounded-2xl border border-[var(--line)] bg-white">
        <table className="w-full text-left text-sm">
          <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
            <tr>
              <th className="px-4 py-3">Материал</th>
              <th className="px-4 py-3">Упаковка</th>
              <th className="px-4 py-3">Цена упак.</th>
              <th className="px-4 py-3">За 1 ед.</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody>
            {materials.map((material) => {
              const cost = unitCost(material.packagePrice, material.packageWeight);
              return (
                <tr key={material.id} className="border-t border-slate-100">
                  <td className="px-4 py-3">
                    <Link href={`/materials/${material.id}`} className="font-medium text-teal-900 hover:underline">
                      {material.name}
                    </Link>
                    <p className="text-xs text-slate-500">{material.category}</p>
                  </td>
                  <td className="px-4 py-3 text-xs">
                    {qtyDisplay(material.packageWeight)} {material.storageUnit.symbol}
                  </td>
                  <td className="px-4 py-3 font-mono text-xs">{moneyDisplay(material.packagePrice)} с</td>
                  <td className="px-4 py-3 font-mono text-xs">
                    {cost ? `${moneyDisplay(cost)} с / ${material.storageUnit.symbol}` : "—"}
                  </td>
                  <td className="px-4 py-3 text-right">
                    {canManage ? (
                      <form action={archiveMaterial}>
                        <input type="hidden" name="id" value={material.id} />
                        <button className="text-xs text-red-700">В архив</button>
                      </form>
                    ) : null}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
