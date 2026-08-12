import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/authz";
import { WarehouseNav } from "@/components/warehouse-nav";
import { moneyDisplay, qtyDisplay } from "@/lib/decimal";
import { D } from "@/lib/decimal";
import { receiveOpening, writeOffStock } from "@/app/actions/inventory";
import { createPurchaseFromShortage } from "@/app/actions/purchasing";
import { randomUUID } from "crypto";

export default async function WarehousePage() {
  const session = await requirePermission("inventory.view");
  const canReceive =
    session.user.roleCode === "owner" || session.user.permissions.includes("inventory.receive");
  const canAdjust =
    session.user.roleCode === "owner" || session.user.permissions.includes("inventory.adjust");
  const canBuy =
    session.user.roleCode === "owner" || session.user.permissions.includes("purchasing.manage");

  const raw = await prisma.warehouse.upsert({
    where: { code: "RAW" },
    update: {},
    create: { code: "RAW", name: "Склад сырья", kind: "material" },
  });
  await prisma.warehouse.upsert({
    where: { code: "FG" },
    update: {},
    create: { code: "FG", name: "Склад готовой продукции", kind: "finished" },
  });

  const [items, materials, suppliers] = await Promise.all([
    prisma.stockItem.findMany({
      where: { warehouseId: raw.id, materialId: { not: null } },
      include: { material: { include: { storageUnit: true } } },
      orderBy: { material: { name: "asc" } },
    }),
    prisma.material.findMany({
      where: { archivedAt: null, isActive: true },
      include: { storageUnit: true, stockItems: { where: { warehouseId: raw.id } } },
      orderBy: { name: "asc" },
    }),
    prisma.supplier.findMany({ where: { archivedAt: null }, orderBy: { name: "asc" } }),
  ]);

  return (
    <div className="space-y-6">
      <div>
<h1 className="mt-1 text-2xl font-semibold">Склад сырья</h1>
        <p className="mt-1 text-sm text-slate-600">
          Доступно = остаток − резерв. Оценка по средневзвешенной (WAC). Движения не удаляются.
        </p>
        <a href="/warehouse/print?warehouse=RAW" className="mt-2 inline-block text-sm text-[var(--titan-dark)] hover:underline">
          Печать остатков / PDF
        </a>
      </div>
      <WarehouseNav current="raw" />

      <div className="overflow-hidden rounded-2xl border border-[var(--line)] bg-white">
        <table className="w-full text-left text-sm">
          <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
            <tr>
              <th className="px-4 py-3">Материал</th>
              <th className="px-4 py-3 text-right">Остаток</th>
              <th className="px-4 py-3 text-right">Резерв</th>
              <th className="px-4 py-3 text-right">Доступно</th>
              <th className="px-4 py-3 text-right">Стоимость</th>
              <th className="px-4 py-3 text-right">Минимум</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody>
            {materials.map((material) => {
              const stock = material.stockItems[0];
              const onHand = D(String(stock?.qtyOnHand ?? 0));
              const reserved = D(String(stock?.qtyReserved ?? 0));
              const avail = onHand.sub(reserved);
              const value = onHand.mul(stock?.wacUnitCost ?? 0);
              const low = onHand.lte(material.minStock);
              return (
                <tr key={material.id} className="border-t border-slate-100">
                  <td className="px-4 py-3">
                    <p className="font-medium">{material.name}</p>
                    {low ? <p className="text-xs text-amber-700">Ниже минимума</p> : null}
                  </td>
                  <td className="px-4 py-3 text-right font-mono text-xs">
                    {qtyDisplay(onHand)} {material.storageUnit.symbol}
                  </td>
                  <td className="px-4 py-3 text-right font-mono text-xs">{qtyDisplay(reserved)}</td>
                  <td className="px-4 py-3 text-right font-mono text-xs">{qtyDisplay(avail)}</td>
                  <td className="px-4 py-3 text-right font-mono text-xs">{moneyDisplay(value)} с</td>
                  <td className="px-4 py-3 text-right font-mono text-xs">
                    {qtyDisplay(material.minStock)} {material.storageUnit.symbol}
                  </td>
                  <td className="px-4 py-3">
                    {canBuy && low && suppliers[0] ? (
                      <form action={createPurchaseFromShortage}>
                        <input type="hidden" name="supplierId" value={suppliers[0].id} />
                        <input type="hidden" name="materialId" value={material.id} />
                        <input
                          type="hidden"
                          name="quantity"
                          value={D(String(material.minStock)).sub(onHand).abs().toFixed(6)}
                        />
                        <button className="text-xs text-[var(--titan-dark)]">Заявка на закупку</button>
                      </form>
                    ) : null}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {canReceive ? (
        <form action={receiveOpening} className="grid gap-2 rounded-2xl border border-[var(--line)] bg-white p-5 sm:grid-cols-5">
          <input type="hidden" name="warehouseId" value={raw.id} />
          <input type="hidden" name="idempotencyKey" value={randomUUID()} />
          <select name="materialId" className="rounded-lg border border-slate-200 px-3 py-2 text-sm">
            {materials.map((m) => (
              <option key={m.id} value={m.id}>
                {m.name}
              </option>
            ))}
          </select>
          <input name="quantity" required placeholder="Количество" className="rounded-lg border border-slate-200 px-3 py-2 text-sm" />
          <input name="unitCost" required placeholder="Цена за ед." className="rounded-lg border border-slate-200 px-3 py-2 text-sm" />
          <input name="comment" placeholder="Комментарий" className="rounded-lg border border-slate-200 px-3 py-2 text-sm" />
          <button className="rounded-lg bg-[var(--titan-dark)] px-3 py-2 text-sm text-white">Приход</button>
        </form>
      ) : null}

      {canAdjust ? (
        <form action={writeOffStock} className="grid gap-2 rounded-2xl border border-[var(--line)] bg-white p-5 sm:grid-cols-5">
          <input type="hidden" name="warehouseId" value={raw.id} />
          <input type="hidden" name="idempotencyKey" value={randomUUID()} />
          <select name="materialId" className="rounded-lg border border-slate-200 px-3 py-2 text-sm">
            {materials.map((m) => (
              <option key={m.id} value={m.id}>
                {m.name}
              </option>
            ))}
          </select>
          <input name="quantity" required placeholder="Списать" className="rounded-lg border border-slate-200 px-3 py-2 text-sm" />
          <input name="reason" required placeholder="Причина" className="rounded-lg border border-slate-200 px-3 py-2 text-sm" />
          <input name="comment" placeholder="Комментарий" className="rounded-lg border border-slate-200 px-3 py-2 text-sm" />
          <button className="rounded-lg bg-red-800 px-3 py-2 text-sm text-white">Списание</button>
        </form>
      ) : null}

      <p className="text-xs text-slate-400">Позиций с остатком: {items.length}</p>
    </div>
  );
}
