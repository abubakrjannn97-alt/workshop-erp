import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/authz";
import { WarehouseNav } from "@/components/warehouse-nav";
import { moneyDisplay, qtyDisplay } from "@/lib/decimal";
import { reverseStockMovement } from "@/app/actions/inventory";
import { randomUUID } from "crypto";

const LABELS: Record<string, string> = {
  RECEIPT: "Приход",
  RESERVE: "Резерв",
  RELEASE: "Снятие резерва",
  ISSUE: "Выдача в производство",
  RETURN: "Возврат из производства",
  WRITE_OFF: "Списание",
  INVENTORY: "Инвентаризация",
  ADJUST: "Корректировка",
  TRANSFER_OUT: "Перемещение −",
  TRANSFER_IN: "Перемещение +",
  REVERSAL: "Сторно",
};

export default async function MovementsPage() {
  const session = await requirePermission("inventory.view");
  const canAdjust =
    session.user.roleCode === "owner" || session.user.permissions.includes("inventory.adjust");
  const movements = await prisma.stockMovement.findMany({
    take: 200,
    orderBy: { createdAt: "desc" },
    include: {
      warehouse: true,
      stockItem: { include: { material: true, product: true } },
      reversedBy: true,
    },
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Складские движения</h1>
        <p className="mt-1 text-sm text-slate-600">Записи не удаляются. Ошибка исправляется сторно.</p>
      </div>
      <WarehouseNav current="moves" />
      <div className="overflow-hidden rounded-2xl border border-[var(--line)] bg-white">
        <table className="w-full text-left text-sm">
          <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
            <tr>
              <th className="px-4 py-3">Время</th>
              <th className="px-4 py-3">Тип</th>
              <th className="px-4 py-3">Позиция</th>
              <th className="px-4 py-3 text-right">Кол-во</th>
              <th className="px-4 py-3 text-right">Сумма</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody>
            {movements.map((m) => (
              <tr key={m.id} className="border-t border-slate-100">
                <td className="px-4 py-3 text-xs text-slate-500">{m.createdAt.toLocaleString("ru-RU")}</td>
                <td className="px-4 py-3">{LABELS[m.type] ?? m.type}</td>
                <td className="px-4 py-3">
                  {m.stockItem.material?.name ?? m.stockItem.product?.name}
                  <p className="text-xs text-slate-400">{m.warehouse.name}</p>
                </td>
                <td className="px-4 py-3 text-right font-mono text-xs">{qtyDisplay(m.qty)}</td>
                <td className="px-4 py-3 text-right font-mono text-xs">{moneyDisplay(m.amount)} с</td>
                <td className="px-4 py-3">
                  {canAdjust && !m.reversedBy && m.type !== "REVERSAL" ? (
                    <form action={reverseStockMovement}>
                      <input type="hidden" name="id" value={m.id} />
                      <input type="hidden" name="idempotencyKey" value={randomUUID()} />
                      <button className="text-xs text-red-700">Сторно</button>
                    </form>
                  ) : m.reversedBy ? (
                    <span className="text-xs text-slate-400">сторнировано</span>
                  ) : null}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
