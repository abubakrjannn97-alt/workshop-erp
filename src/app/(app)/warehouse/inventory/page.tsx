import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/authz";
import { WarehouseNav } from "@/components/warehouse-nav";
import { createInventoryCount } from "@/app/actions/inventory";

export default async function InventoryListPage() {
  const session = await requirePermission("inventory.count");
  const warehouses = await prisma.warehouse.findMany({ orderBy: { name: "asc" } });
  const counts = await prisma.inventoryCount.findMany({
    orderBy: { createdAt: "desc" },
    include: { warehouse: true },
    take: 50,
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Инвентаризация</h1>
        <p className="mt-1 text-sm text-slate-600">
          Система показывает учёт, сотрудник вводит факт. Разница проводится только с причиной и правом корректировки.
        </p>
      </div>
      <WarehouseNav current="inventory" />
      <form action={createInventoryCount} className="flex gap-2 rounded-2xl border border-[var(--line)] bg-white p-4">
        <select name="warehouseId" className="rounded-lg border border-slate-200 px-3 py-2 text-sm">
          {warehouses.map((w) => (
            <option key={w.id} value={w.id}>
              {w.name}
            </option>
          ))}
        </select>
        <button className="rounded-lg bg-teal-800 px-4 py-2 text-sm text-white">Начать пересчёт</button>
      </form>
      <ul className="space-y-2">
        {counts.map((c) => (
          <li key={c.id} className="rounded-xl border border-[var(--line)] bg-white px-4 py-3 text-sm">
            <Link href={`/warehouse/inventory/${c.id}`} className="font-medium hover:underline">
              {c.warehouse.name} · {c.createdAt.toLocaleString("ru-RU")}
            </Link>
            <span className="ml-2 text-xs text-slate-500">{c.status === "DRAFT" ? "черновик" : "проведена"}</span>
          </li>
        ))}
      </ul>
      <p className="hidden">{session.user.id}</p>
    </div>
  );
}
