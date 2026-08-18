import { PageHeader } from "@/components/page-header";
import { getTranslator, intlLocale } from "@/lib/locale";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/authz";
import { updateProduct } from "@/app/actions/products";
import { CatalogNav } from "@/components/catalog-nav";
import { materialCostForRecipe } from "@core/costing/costing";
import { moneyDisplay } from "@core/shared/decimal";
import { RecipeEditor } from "./recipe-editor";
import { NeedPreview } from "./need-preview";

export default async function ProductDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { t, locale } = await getTranslator();
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
    <div className="page-stack">
      <div>
        <p className="text-xs font-medium uppercase tracking-[0.16em] text-[var(--titan-dark)]">{t("common.product")}</p>
        <PageHeader title={product.name} />
      </div>
      <CatalogNav current="products" locale={locale} />

      <form action={updateProduct} className="grid gap-3 ui-card sm:grid-cols-2">
        <input type="hidden" name="id" value={product.id} />
        <Field name="name" label={t("common.name")} defaultValue={product.name} disabled={!canManage} />
        <Field name="category" label={t("common.category")} defaultValue={product.category} disabled={!canManage} />
        <label className="block text-sm">
          <span className="font-medium">{t("products.saleUnit")}</span>
          <select name="saleUnitId" defaultValue={product.saleUnitId} disabled={!canManage} className="mt-1 w-full rounded-lg border border-[var(--border)] px-3 py-2 text-sm">
            {units.map((u) => (
              <option key={u.id} value={u.id}>
                {u.name} ({u.symbol})
              </option>
            ))}
          </select>
        </label>
        <label className="block text-sm">
          <span className="font-medium">{t("products.fgUnit")}</span>
          <select name="outputUnitId" defaultValue={product.outputUnitId} disabled={!canManage} className="mt-1 w-full rounded-lg border border-[var(--border)] px-3 py-2 text-sm">
            {units.map((u) => (
              <option key={u.id} value={u.id}>
                {u.name} ({u.symbol})
              </option>
            ))}
          </select>
        </label>
        <Field name="recipeBaseQty" label={t("products.recipeBaseShort")} defaultValue={product.recipeBaseQty.toString()} disabled={!canManage} />
        <Field name="outputPerBase" label={t("products.outputBaseShort")} defaultValue={product.outputPerBase.toString()} disabled={!canManage} />
        <Field name="price" label={t("products.salePrice")} defaultValue={currentPrice?.price.toString() ?? "0"} disabled={!canManage} />
        <Field name="minPrice" label={t("products.minPrice")} defaultValue={product.minPrice.toString()} disabled={!canManage} />
        {canManage ? (
          <button className="sm:col-span-2 ui-btn-primary">
            {t("products.savePriceHist")}
          </button>
        ) : null}
      </form>

      <section className="ui-card">
        <h2 className="text-sm font-semibold">{t("products.matCostTitle")}</h2>
        <p className="mt-1 text-xs text-[var(--muted)]">
          {t("products.matCostHint")}
        </p>
        {cost ? (
          <ul className="mt-4 space-y-2 text-sm">
            {cost.lines.map((line) => (
              <li key={line.materialId} className="flex justify-between gap-4 border-b border-[var(--line)] py-2">
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
          <p className="mt-3 text-sm text-[var(--muted)]">{t("products.noRecipe")}</p>
        )}
        <p className="mt-4 text-sm font-semibold">
          {t("products.totalOn")} {product.recipeBaseQty.toString()} {product.saleUnit.symbol}:{" "}
          {cost?.total ? `${moneyDisplay(cost.total)} с` : t("products.costUnset")}
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
          locale={locale}
        />
      ) : null}

      <section className="ui-card">
        <h2 className="text-sm font-semibold">{t("products.recipe")}</h2>
        <p className="mt-1 text-xs text-[var(--muted)]">
          {t("products.recipeHint")}
        </p>
        {currentVersion ? (
          <p className="mt-2 text-sm">
            {t("products.currentVer")}: V{currentVersion.versionNumber} ·{" "}
            {currentVersion.validFrom.toLocaleDateString(intlLocale(locale))}
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
              locale={locale}
            />
          </div>
        ) : null}
        <div className="mt-6 space-y-2">
          {product.recipe?.versions.map((version) => (
            <div key={version.id} className="rounded-lg bg-[var(--surface-muted)] px-3 py-2 text-xs text-[var(--text-muted)]">
              V{version.versionNumber}: {version.validFrom.toLocaleDateString(intlLocale(locale))}
              {version.validTo ? ` — ${version.validTo.toLocaleDateString(intlLocale(locale))}` : ` — ${t("common.active")}`}
              {version.comment ? ` · ${version.comment}` : ""}
            </div>
          ))}
        </div>
      </section>

      <section className="ui-card">
        <h2 className="text-sm font-semibold">{t("products.priceHistory")}</h2>
        <ul className="mt-3 space-y-1 text-sm">
          {product.prices.map((row) => (
            <li key={row.id} className="flex justify-between">
              <span>
                {row.validFrom.toLocaleDateString(intlLocale(locale))}
                {row.validTo ? ` — ${row.validTo.toLocaleDateString(intlLocale(locale))}` : ` — ${t("common.active")}`}
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
        className="mt-1 w-full rounded-lg border border-[var(--border)] px-3 py-2 text-sm disabled:bg-[var(--surface-muted)]"
      />
    </label>
  );
}
