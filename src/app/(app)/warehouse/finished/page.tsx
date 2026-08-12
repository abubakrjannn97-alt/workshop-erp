import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/authz";
import { WarehouseNav } from "@/components/warehouse-nav";
import { moneyDisplay, qtyDisplay } from "@/lib/decimal";
import { D } from "@/lib/decimal";
import { receiveOpening } from "@/app/actions/inventory";
import { randomUUID } from "crypto";

export default async function FinishedWarehousePage() {
  const session = await requirePermission("inventory.view");
  const canReceive =
    session.user.roleCode === "owner" || session.user.permissions.includes("inventory.receive");
  const fg = await prisma.warehouse.upsert({
    where: { code: "FG" },
    update: {},
    create: { code: "FG", name: "Склад готовой продукции", kind: "finished" },
  });
  const [items, products] = await Promise.all([
    prisma.stockItem.findMany({
      where: { warehouseId: fg.id, productId: { not: null } },
      include: { product: { include: { saleUnit: true, outputUnit: true } } },
      orderBy: { product: { name: "asc" } },
    }),
    prisma.product.findMany({ where: { archivedAt: null, isActive: true }, orderBy: { name: "asc" } }),
  ]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Готовая продукция</h1>
        <p className="mt-1 text-sm text-slate-600">Отдельный склад, не смешивается с сырьём.</p>
      </div>
      <WarehouseNav current="fg" />
      <div className="overflow-hidden rounded-2xl border border-[var(--line)] bg-white">
        <table className="w-full text-left text-sm">
          <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
            <tr>
              <th className="px-4 py-3">Изделие</th>
              <th className="px-4 py-3 text-right">Остаток</th>
              <th className="px-4 py-3 text-right">Резерв</th>
              <th className="px-4 py-3 text-right">Доступно</th>
              <th className="px-4 py-3 text-right">Себестоимость</th>
            </tr>
          </thead>
          <tbody>
            {items.length === 0 ? (
              <tr>
                <td className="px-4 py-8 text-slate-500" colSpan={5}>
                  Остатков нет. Выпуск из закрытой партии попадает сюда; можно ввести начальный остаток.
                </td>
              </tr>
            ) : (
              items.map((item) => {
                const onHand = D(String(item.qtyOnHand));
                const reserved = D(String(item.qtyReserved));
                return (
                  <tr key={item.id} className="border-t border-slate-100">
                    <td className="px-4 py-3 font-medium">{item.product?.name}</td>
                    <td className="px-4 py-3 text-right font-mono text-xs">
                      {qtyDisplay(onHand)} {item.product?.saleUnit.symbol}
                    </td>
                    <td className="px-4 py-3 text-right font-mono text-xs">{qtyDisplay(reserved)}</td>
                    <td className="px-4 py-3 text-right font-mono text-xs">{qtyDisplay(onHand.sub(reserved))}</td>
                    <td className="px-4 py-3 text-right font-mono text-xs">
                      {moneyDisplay(onHand.mul(item.wacUnitCost))} с
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
      {canReceive ? (
        <form action={receiveOpening} className="grid gap-2 rounded-2xl border border-[var(--line)] bg-white p-5 sm:grid-cols-5">
          <input type="hidden" name="warehouseId" value={fg.id} />
          <input type="hidden" name="idempotencyKey" value={randomUUID()} />
          <select name="productId" className="rounded-lg border border-slate-200 px-3 py-2 text-sm">
            {products.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
          <input name="quantity" required placeholder="Количество" className="rounded-lg border border-slate-200 px-3 py-2 text-sm" />
          <input name="unitCost" required placeholder="Себестоимость ед." className="rounded-lg border border-slate-200 px-3 py-2 text-sm" />
          <input name="comment" placeholder="Начальный остаток / партия" className="rounded-lg border border-slate-200 px-3 py-2 text-sm" />
          <button className="rounded-lg bg-[var(--titan-dark)] px-3 py-2 text-sm text-white">Приход</button>
        </form>
      ) : null}
    </div>
  );
}
