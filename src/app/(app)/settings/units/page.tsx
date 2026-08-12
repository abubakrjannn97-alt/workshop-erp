import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/authz";
import { archiveUnit, createUnit, updateUnit } from "@/app/actions/units";

const CATEGORIES = [
  { value: "mass", label: "Масса" },
  { value: "area", label: "Площадь" },
  { value: "count", label: "Количество" },
  { value: "length", label: "Длина" },
  { value: "volume", label: "Объём" },
  { value: "other", label: "Другое" },
];

export default async function UnitsPage() {
  const session = await requirePermission("units.view");
  const canManage =
    session.user.roleCode === "owner" || session.user.permissions.includes("units.manage");
  const units = await prisma.unit.findMany({
    where: { archivedAt: null },
    orderBy: [{ category: "asc" }, { name: "asc" }],
  });

  return (
    <div className="space-y-6">
      <Header />
      {canManage ? (
        <form action={createUnit} className="grid gap-3 rounded-2xl border border-[var(--line)] bg-white p-5 sm:grid-cols-6">
          <input name="code" placeholder="Код, напр. KG" className="rounded-lg border border-slate-200 px-3 py-2 text-sm" required />
          <input name="name" placeholder="Название" className="rounded-lg border border-slate-200 px-3 py-2 text-sm" required />
          <input name="symbol" placeholder="Символ" className="rounded-lg border border-slate-200 px-3 py-2 text-sm" required />
          <select name="category" className="rounded-lg border border-slate-200 px-3 py-2 text-sm">
            {CATEGORIES.map((c) => (
              <option key={c.value} value={c.value}>
                {c.label}
              </option>
            ))}
          </select>
          <input name="toBaseFactor" defaultValue="1" placeholder="К базовой" className="rounded-lg border border-slate-200 px-3 py-2 text-sm" />
          <button className="rounded-lg bg-teal-800 px-3 py-2 text-sm font-medium text-white">Добавить</button>
          <label className="sm:col-span-6 flex items-center gap-2 text-sm text-slate-600">
            <input type="checkbox" name="isBase" /> Базовая единица
          </label>
        </form>
      ) : null}

      <div className="overflow-hidden rounded-2xl border border-[var(--line)] bg-white">
        <table className="w-full text-left text-sm">
          <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
            <tr>
              <th className="px-4 py-3">Код</th>
              <th className="px-4 py-3">Название</th>
              <th className="px-4 py-3">Символ</th>
              <th className="px-4 py-3">Категория</th>
              <th className="px-4 py-3">К базовой</th>
              {canManage ? <th className="px-4 py-3" /> : null}
            </tr>
          </thead>
          <tbody>
            {units.map((unit) => (
              <tr key={unit.id} className="border-t border-slate-100">
                <td className="px-4 py-3 font-mono text-xs">{unit.code}</td>
                <td className="px-4 py-3">
                  {canManage ? (
                    <form action={updateUnit} className="flex flex-wrap items-center gap-2">
                      <input type="hidden" name="id" value={unit.id} />
                      <input type="hidden" name="category" value={unit.category} />
                      {unit.isBase ? <input type="hidden" name="isBase" value="on" /> : null}
                      <input name="name" defaultValue={unit.name} className="w-40 rounded border border-slate-200 px-2 py-1" />
                      <input name="symbol" defaultValue={unit.symbol} className="w-20 rounded border border-slate-200 px-2 py-1" />
                      <input
                        name="toBaseFactor"
                        defaultValue={unit.toBaseFactor.toString()}
                        className="w-24 rounded border border-slate-200 px-2 py-1"
                      />
                      <button className="text-xs font-medium text-teal-800">Сохранить</button>
                    </form>
                  ) : (
                    unit.name
                  )}
                </td>
                <td className="px-4 py-3">{unit.symbol}</td>
                <td className="px-4 py-3">{unit.category}</td>
                <td className="px-4 py-3 font-mono text-xs">{unit.toBaseFactor.toString()}</td>
                {canManage ? (
                  <td className="px-4 py-3">
                    <form action={archiveUnit}>
                      <input type="hidden" name="id" value={unit.id} />
                      <button className="text-xs text-red-700">В архив</button>
                    </form>
                  </td>
                ) : null}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function Header() {
  return (
    <div>
      <h1 className="text-2xl font-semibold">Единицы измерения</h1>
      <p className="mt-1 text-sm text-slate-600">
        м², штуки, кг, упаковки, погонные метры, ведро. Для песка коэффициент «1 ведро = X кг»
        задаётся в единице BUCKET.
      </p>
      <div className="mt-4 flex flex-wrap gap-2 text-sm">
        <Link className="rounded-full bg-white px-3 py-1 ring-1 ring-slate-200" href="/settings">
          Бизнес
        </Link>
        <Link className="rounded-full bg-teal-800 px-3 py-1 text-white" href="/settings/units">
          Единицы
        </Link>
      </div>
    </div>
  );
}
