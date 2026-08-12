import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/authz";
import { CatalogNav } from "@/components/catalog-nav";
import { materialCostForRecipe } from "@/lib/costing";
import { moneyDisplay } from "@/lib/decimal";
import { archiveProduct } from "@/app/actions/products";

export default async function ProductsPage() {
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
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-xs font-medium uppercase tracking-[0.16em] text-teal-800">PHASE 2</p>
          <h1 className="mt-1 text-2xl font-semibold">Продукция</h1>
          <p className="mt-1 text-sm text-slate-600">
            Цена хранится с периодом действия. Себестоимость считается из рецептуры, не вводится вручную.
          </p>
        </div>
        {canManage ? (
          <Link href="/products/new" className="rounded-lg bg-teal-800 px-4 py-2 text-sm font-medium text-white">
            Новое изделие
          </Link>
        ) : null}
      </div>
      <CatalogNav current="products" />

      <div className="overflow-hidden rounded-2xl border border-[var(--line)] bg-white">
        <table className="w-full text-left text-sm">
          <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
            <tr>
              <th className="px-4 py-3">Изделие</th>
              <th className="px-4 py-3">Ед.</th>
              <th className="px-4 py-3">Цена</th>
              <th className="px-4 py-3">Матер. себестоимость</th>
              <th className="px-4 py-3">Выход</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody>
            {products.length === 0 ? (
              <tr>
                <td className="px-4 py-8 text-slate-500" colSpan={6}>
                  Изделий пока нет.
                </td>
              </tr>
            ) : (
              products.map((product) => {
                const version = product.recipe?.versions[0];
                const cost = version
                  ? materialCostForRecipe(version.items)
                  : { total: null, missingPrices: true };
                const price = product.prices[0]?.price;
                return (
                  <tr key={product.id} className="border-t border-slate-100">
                    <td className="px-4 py-3">
                      <Link href={`/products/${product.id}`} className="font-medium text-teal-900 hover:underline">
                        {product.name}
                      </Link>
                      <p className="text-xs text-slate-500">{product.category}</p>
                    </td>
                    <td className="px-4 py-3">{product.saleUnit.symbol}</td>
                    <td className="px-4 py-3 font-mono text-xs">
                      {price ? `${moneyDisplay(price)} с` : "—"}
                    </td>
                    <td className="px-4 py-3 font-mono text-xs">
                      {cost.total ? `${moneyDisplay(cost.total)} с` : "неполная"}
                    </td>
                    <td className="px-4 py-3 text-xs text-slate-600">
                      {product.outputPerBase.toString()} {product.outputUnit.symbol} / {product.recipeBaseQty.toString()}{" "}
                      {product.saleUnit.symbol}
                    </td>
                    <td className="px-4 py-3 text-right">
                      {canManage ? (
                        <form action={archiveProduct}>
                          <input type="hidden" name="id" value={product.id} />
                          <button className="text-xs text-red-700">В архив</button>
                        </form>
                      ) : null}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
