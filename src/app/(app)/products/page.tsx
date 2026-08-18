import { PageHeader } from "@/components/page-header";
import { getTranslator } from "@core/shared/i18n/locale";
import Link from "next/link";
import { prisma } from "@core/infrastructure/prisma";
import { requirePermission } from "@core/auth/authz";
import { CatalogNav } from "@/components/catalog-nav";
import { materialCostForRecipe } from "@core/costing/costing";
import { moneyDisplay } from "@core/shared/decimal";
import { archiveProduct } from "@/app/actions/products";
import { RevealList } from "@/components/reveal-list";
import { DataTableSection, UiTable } from "@/components/data-table";

export default async function ProductsPage() {
  const { t, locale } = await getTranslator();
  const session = await requirePermission("products.view");
  const canManage =
    session.user.roleCode === "owner" || session.user.permissions.includes("products.manage");

  const products = await prisma.product.findMany({
    where: { archivedAt: null },
    include: {
      saleUnit: true,
      outputUnit: true,
      prices: { where: { validTo: null }, take: 1 },
      recipe: {
        include: {
          versions: {
            where: { validTo: null },
            include: {
              items: { include: { material: { include: { storageUnit: true } }, unit: true } },
            },
            take: 1,
            orderBy: { versionNumber: "desc" },
          },
        },
      },
    },
    orderBy: { name: "asc" },
  });

  return (
    <div className="page-stack">
      <PageHeader
        title={t("page.products")}
        description={t("products.hint")}
        actions={
          canManage ? (
            <Link href="/products/new" className="ui-btn-primary" data-tour="products-new">
              {t("products.newTitle")}
            </Link>
          ) : null
        }
      />
      <CatalogNav current="products" locale={locale} />

      <DataTableSection tour="products-list">
        <UiTable>
          <table className="w-full text-left text-sm">
            <thead className="bg-[var(--surface-muted)] text-xs uppercase tracking-wide text-[var(--muted)]">
              <tr>
                <th className="px-4 py-3">{t("common.product")}</th>
                <th className="px-4 py-3">{t("common.unit")}</th>
                <th className="px-4 py-3">{t("common.price")}</th>
                <th className="px-4 py-3">{t("products.matCost")}</th>
                <th className="px-4 py-3">{t("products.output")}</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            {products.length === 0 ? (
              <tbody>
                <tr>
                  <td className="px-3 py-6 text-[var(--muted)]" colSpan={6}>
                    {t("products.empty")}
                  </td>
                </tr>
              </tbody>
            ) : (
              <RevealList as="tbody" moreLabel={t("home.seeAll")} lessLabel={t("home.hide")} limit={5}>
                {products.map((product) => {
                  const version = product.recipe?.versions[0];
                  const cost = version
                    ? materialCostForRecipe(version.items)
                    : { total: null, missingPrices: true };
                  const price = product.prices[0]?.price;
                  return (
                    <tr key={product.id} className="border-t border-[var(--line)]">
                      <td className="px-4 py-3">
                        <Link href={`/products/${product.id}`} className="font-medium text-[var(--titan-dark)] hover:underline">
                          {product.name}
                        </Link>
                        <p className="text-xs text-[var(--muted)]">{product.category}</p>
                      </td>
                      <td className="px-4 py-3" data-label={t("common.unit")}>
                        {product.saleUnit.symbol}
                      </td>
                      <td className="px-4 py-3 font-mono text-xs" data-label={t("common.price")}>
                        {price ? `${moneyDisplay(price)} с` : "—"}
                      </td>
                      <td className="px-4 py-3 font-mono text-xs" data-label={t("products.matCost")}>
                        {cost.total ? `${moneyDisplay(cost.total)} с` : t("products.incomplete")}
                      </td>
                      <td className="px-4 py-3 text-xs text-[var(--text-muted)]" data-label={t("products.output")}>
                        {product.outputPerBase.toString()} {product.outputUnit.symbol} / {product.recipeBaseQty.toString()}{" "}
                        {product.saleUnit.symbol}
                      </td>
                      <td className="px-4 py-3 text-right">
                        {canManage ? (
                          <form action={archiveProduct}>
                            <input type="hidden" name="id" value={product.id} />
                            <button className="text-xs text-[var(--danger)]">{t("common.archive")}</button>
                          </form>
                        ) : null}
                      </td>
                    </tr>
                  );
                })}
              </RevealList>
            )}
          </table>
        </UiTable>
      </DataTableSection>
    </div>
  );
}
