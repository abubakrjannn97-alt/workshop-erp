import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/authz";
import { createSupplier } from "@/app/actions/suppliers";
import { PurchaseOrderForm } from "./po-form";
import { moneyDisplay } from "@/lib/decimal";
import { D } from "@/lib/decimal";

const STATUS: Record<string, string> = {
  REQUEST: "Заявка",
  ORDERED: "Заказано",
  POSTED: "Оприходовано",
  CANCELLED: "Отменено",
};

export default async function PurchasingPage() {
  const session = await requirePermission("purchasing.view");
  const canManage =
    session.user.roleCode === "owner" || session.user.permissions.includes("purchasing.manage");
  const canSuppliers =
    session.user.roleCode === "owner" || session.user.permissions.includes("suppliers.manage");

  const [orders, suppliers, materials] = await Promise.all([
    prisma.purchaseOrder.findMany({
      orderBy: { createdAt: "desc" },
      include: { supplier: true },
      take: 50,
    }),
    prisma.supplier.findMany({
      where: { archivedAt: null },
      include: { orders: true },
      orderBy: { name: "asc" },
    }),
    prisma.material.findMany({ where: { archivedAt: null, isActive: true }, orderBy: { name: "asc" } }),
  ]);

  return (
    <div className="space-y-6">
      <div>
<h1 className="mt-1 text-2xl font-semibold">Закупки</h1>
        <p className="mt-1 text-sm text-slate-600">
          Потребность → заявка → поставщик → получение → приход на склад.
        </p>
      </div>

      <section className="rounded-2xl border border-[var(--line)] bg-white p-5">
        <h2 className="text-sm font-semibold">Поставщики</h2>
        <ul className="mt-3 space-y-2 text-sm">
          {suppliers.map((s) => {
            const turnover = s.orders.reduce((sum, o) => sum.add(o.total), D(0));
            const debt = s.orders.reduce((sum, o) => sum.add(D(String(o.total)).sub(o.paidAmount)), D(0));
            return (
              <li key={s.id} className="flex justify-between gap-4">
                <Link href={`/purchasing/suppliers/${s.id}`} className="font-medium hover:underline">
                  {s.name}
                </Link>
                <span className="font-mono text-xs">
                  закупки {moneyDisplay(turnover)} с · долг {moneyDisplay(debt)} с
                </span>
              </li>
            );
          })}
        </ul>
        {canSuppliers ? (
          <form action={createSupplier} className="mt-4 grid gap-2 sm:grid-cols-4">
            <input name="name" required placeholder="Название" className="rounded-lg border border-slate-200 px-3 py-2 text-sm" />
            <input name="phone" placeholder="Телефон" className="rounded-lg border border-slate-200 px-3 py-2 text-sm" />
            <input name="contact" placeholder="Контакт" className="rounded-lg border border-slate-200 px-3 py-2 text-sm" />
            <button className="rounded-lg bg-[var(--titan-dark)] px-3 py-2 text-sm text-white">Добавить</button>
          </form>
        ) : null}
      </section>

      {canManage ? (
        <PurchaseOrderForm
          suppliers={suppliers.map((s) => ({ id: s.id, name: s.name }))}
          materials={materials.map((m) => ({ id: m.id, name: m.name }))}
        />
      ) : null}

      <div className="overflow-hidden rounded-2xl border border-[var(--line)] bg-white">
        <table className="w-full text-left text-sm">
          <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
            <tr>
              <th className="px-4 py-3">Номер</th>
              <th className="px-4 py-3">Поставщик</th>
              <th className="px-4 py-3">Статус</th>
              <th className="px-4 py-3 text-right">Сумма</th>
              <th className="px-4 py-3 text-right">Долг</th>
            </tr>
          </thead>
          <tbody>
            {orders.map((o) => (
              <tr key={o.id} className="border-t border-slate-100">
                <td className="px-4 py-3">
                  <Link href={`/purchasing/${o.id}`} className="font-medium hover:underline">
                    {o.number}
                  </Link>
                </td>
                <td className="px-4 py-3">{o.supplier.name}</td>
                <td className="px-4 py-3">{STATUS[o.status] ?? o.status}</td>
                <td className="px-4 py-3 text-right font-mono text-xs">{moneyDisplay(o.total)} с</td>
                <td className="px-4 py-3 text-right font-mono text-xs">
                  {moneyDisplay(D(String(o.total)).sub(o.paidAmount))} с
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
