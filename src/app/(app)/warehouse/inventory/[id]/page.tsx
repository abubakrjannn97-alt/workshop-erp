import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/authz";
import { confirmInventoryCount } from "@/app/actions/inventory";
import { moneyDisplay, qtyDisplay } from "@/lib/decimal";
import { D } from "@/lib/decimal";

export default async function InventoryDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  await requirePermission("inventory.count");
  const session = await requirePermission("inventory.view");
  const canConfirm =
    session.user.roleCode === "owner" || session.user.permissions.includes("inventory.adjust");
  const count = await prisma.inventoryCount.findUnique({
    where: { id },
    include: {
      warehouse: true,
      lines: { include: { stockItem: { include: { material: true, product: true } } } },
    },
  });
  if (!count) notFound();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Пересчёт · {count.warehouse.name}</h1>
        <p className="text-sm text-slate-500">{count.status === "DRAFT" ? "Черновик" : "Проведена"}</p>
      </div>
      <form action={confirmInventoryCount} className="space-y-4 rounded-2xl border border-[var(--line)] bg-white p-5">
        <input type="hidden" name="id" value={count.id} />
        <table className="w-full text-left text-sm">
          <thead className="text-xs uppercase text-slate-500">
            <tr>
              <th className="py-2">Позиция</th>
              <th className="py-2 text-right">По учёту</th>
              <th className="py-2 text-right">Факт</th>
              <th className="py-2 text-right">Разница</th>
            </tr>
          </thead>
          <tbody>
            {count.lines.map((line) => (
              <tr key={line.id} className="border-t border-slate-100">
                <td className="py-2">
                  {line.stockItem.material?.name ?? line.stockItem.product?.name}
                  <input type="hidden" name="lineId" value={line.id} />
                </td>
                <td className="py-2 text-right font-mono text-xs">{qtyDisplay(line.systemQty)}</td>
                <td className="py-2 text-right">
                  <input
                    name="actualQty"
                    defaultValue={line.actualQty.toString()}
                    disabled={count.status !== "DRAFT"}
                    className="w-28 rounded border border-slate-200 px-2 py-1 text-right text-sm"
                  />
                </td>
                <td className="py-2 text-right font-mono text-xs">
                  {qtyDisplay(line.difference)} / {moneyDisplay(line.amount)} с
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {count.status === "DRAFT" && canConfirm ? (
          <>
            <input name="reason" required placeholder="Причина расхождений" className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm" />
            <button className="rounded-lg bg-teal-800 px-4 py-2 text-sm text-white">
              Подтвердить и провести корректировку
            </button>
          </>
        ) : null}
      </form>
      <p className="text-xs text-slate-400">
        Пример из ТЗ: учёт 420 кг, факт 405 кг, разница −15 кг, стоимость −60 с при цене 4 с/кг.
        Сейчас разница считается по WAC каждой позиции:{" "}
        {count.lines[0] ? moneyDisplay(D(String(count.lines[0].unitCost))) : "—"} с/ед.
      </p>
    </div>
  );
}
