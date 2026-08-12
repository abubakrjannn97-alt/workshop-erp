import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/authz";
import { updateProduct } from "@/app/actions/products";
import { CatalogNav } from "@/components/catalog-nav";
import { materialCostForRecipe } from "@/lib/costing";
import { moneyDisplay } from "@/lib/decimal";
import { RecipeEditor } from "./recipe-editor";
import { NeedPreview } from "./need-preview";

export default async function ProductDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await requirePermission("products.view");
  const canManage =
    session.user.roleCode === "owner" || session.user.permissions.includes("products.manage");
  const canRecipe =
    session.user.roleCode === "owner" || session.user.permissions.includes("recipes.manage");

  const [product, units, materials] = await Promise.all([
    prisma.product.findUnique({
      where: { id },
      include: {
        saleUnit: true,
        outputUnit: true,
        prices: { orderBy: { validFrom: "desc" } },
        recipe: {
          include: {
            versions: {
              orderBy: { versionNumber: "desc" },
              include: {
                items: { include: { material: { include: { storageUnit: true } }, unit: true } },
              },
            },
          },
        },
      },
    }),
    prisma.unit.findMany({ where: { archivedAt: null, isActive: true }, orderBy: { name: "asc" } }),
    prisma.material.findMany({
      where: { archivedAt: null, isActive: true },
      orderBy: { name: "asc" },
    }),
  ]);

  if (!product || product.archivedAt) notFound();

  const currentPrice = product.prices.find((p) => !p.validTo);
  const currentVersion = product.recipe?.versions.find((v) => !v.validTo) ?? product.recipe?.versions[0];
  const cost = currentVersion ? materialCostForRecipe(currentVersion.items) : null;

  return (
    <div className="space-y-6">
      <div>
        <p className="text-xs font-medium uppercase tracking-[0.16em] text-teal-800">Изделие</p>
        <h1 className="mt-1 text-2xl font-semibold">{product.name}</h1>
      </div>
      <CatalogNav current="products" />

      <form action={updateProduct} className="grid gap-3 rounded-2xl border border-[var(--line)] bg-white p-6 sm:grid-cols-2">
        <input type="hidden" name="id" value={product.id} />
        <Field name="name" label="Название" defaultValue={product.name} disabled={!canManage} />
        <Field name="category" label="Категория" defaultValue={product.category} disabled={!canManage} />
        <Field name="photoUrl" label="Фотография (URL)" defaultValue={product.photoUrl ?? ""} disabled={!canManage} />
        <label className="block text-sm">
          <span className="font-medium">Единица продажи</span>
          <select name="saleUnitId" defaultValue={product.saleUnitId} disabled={!canManage} className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm">
            {units.map((u) => (
              <option key={u.id} value={u.id}>
                {u.name} ({u.symbol})
              </option>
            ))}
          </select>
        </label>
        <label className="block text-sm">
          <span className="font-medium">Единица готовой продукции</span>
          <select name="outputUnitId" defaultValue={product.outputUnitId} disabled={!canManage} className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm">
            {units.map((u) => (
              <option key={u.id} value={u.id}>
                {u.name} ({u.symbol})
              </option>
            ))}
          </select>
        </label>
        <Field name="recipeBaseQty" label="База рецептуры" defaultValue={product.recipeBaseQty.toString()} disabled={!canManage} />
        <Field name="outputPerBase" label="Выход с базы" defaultValue={product.outputPerBase.toString()} disabled={!canManage} />
        <Field name="price" label="Цена продажи, сомони" defaultValue={currentPrice?.price.toString() ?? "0"} disabled={!canManage} />
        <Field name="minPrice" label="Минимальная цена" defaultValue={product.minPrice.toString()} disabled={!canManage} />
        {canManage ? (
          <button className="sm:col-span-2 rounded-lg bg-teal-800 px-4 py-2 text-sm font-medium text-white">
            Сохранить. Старая цена останется в истории.
          </button>
        ) : null}
      </form>

      <section className="rounded-2xl border border-[var(--line)] bg-white p-6">
        <h2 className="text-sm font-semibold">Материальная себестоимость</h2>
        <p className="mt-1 text-xs text-slate-500">
          Считается из рецептуры и закупочных цен. Это ещё не полная себестоимость: рабочие, комиссия и постоянные
          расходы подключаются в следующих фазах.
        </p>
        {cost ? (
          <ul className="mt-4 space-y-2 text-sm">
            {cost.lines.map((line) => (
              <li key={line.materialId} className="flex justify-between gap-4 border-b border-slate-100 py-2">
                <span>
                  {line.materialName}: {line.quantity} {line.unitSymbol}
                  {line.warning ? <span className="ml-2 text-xs text-amber-700">{line.warning}</span> : null}
                </span>
                <span className="font-mono text-xs">
                  {line.lineCost ? `${moneyDisplay(line.lineCost)} с` : "—"}
                </span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-3 text-sm text-slate-500">Рецептура ещё не опубликована.</p>
        )}
        <p className="mt-4 text-sm font-semibold">
          Итого на {product.recipeBaseQty.toString()} {product.saleUnit.symbol}:{" "}
          {cost?.total ? `${moneyDisplay(cost.total)} с` : "не рассчитано (нет цены песка или компонента)"}
        </p>
      </section>

      {cost ? (
        <NeedPreview
          lines={cost.lines.map((l) => ({
            materialName: l.materialName,
            quantity: l.quantity,
            unitSymbol: l.unitSymbol,
            lineCost: l.lineCost,
          }))}
          outputPerBase={product.outputPerBase.toString()}
          outputSymbol={product.outputUnit.symbol}
          saleSymbol={product.saleUnit.symbol}
          recipeBaseQty={product.recipeBaseQty.toString()}
        />
      ) : null}

      <section className="rounded-2xl border border-[var(--line)] bg-white p-6">
        <h2 className="text-sm font-semibold">Рецептура</h2>
        <p className="mt-1 text-xs text-slate-500">
          Изменение публикует новую версию. Старые версии не пересчитываются.
        </p>
        {currentVersion ? (
          <p className="mt-2 text-sm">
            Текущая: V{currentVersion.versionNumber} с {currentVersion.validFrom.toLocaleDateString("ru-RU")}
          </p>
        ) : null}
        {canRecipe ? (
          <div className="mt-4">
            <RecipeEditor
              productId={product.id}
              materials={materials.map((m) => ({ id: m.id, name: m.name }))}
              units={units.map((u) => ({ id: u.id, name: u.name, extra: u.symbol }))}
              initial={
                currentVersion?.items.map((item) => ({
                  materialId: item.materialId,
                  quantity: item.quantity.toString(),
                  unitId: item.unitId,
                })) ?? []
              }
            />
          </div>
        ) : null}
        <div className="mt-6 space-y-2">
          {product.recipe?.versions.map((version) => (
            <div key={version.id} className="rounded-lg bg-slate-50 px-3 py-2 text-xs text-slate-600">
              V{version.versionNumber}: {version.validFrom.toLocaleDateString("ru-RU")}
              {version.validTo ? ` — ${version.validTo.toLocaleDateString("ru-RU")}` : " — действует"}
              {version.comment ? ` · ${version.comment}` : ""}
            </div>
          ))}
        </div>
      </section>

      <section className="rounded-2xl border border-[var(--line)] bg-white p-6">
        <h2 className="text-sm font-semibold">История цен продажи</h2>
        <ul className="mt-3 space-y-1 text-sm">
          {product.prices.map((row) => (
            <li key={row.id} className="flex justify-between">
              <span>
                {row.validFrom.toLocaleDateString("ru-RU")}
                {row.validTo ? ` — ${row.validTo.toLocaleDateString("ru-RU")}` : " — действует"}
              </span>
              <span className="font-mono text-xs">{moneyDisplay(row.price)} с</span>
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
