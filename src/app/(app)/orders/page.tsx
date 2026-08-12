import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/authz";
import { hasPermission } from "@/lib/authz";
import { SalesNav } from "@/components/sales-nav";
import { D, moneyDisplay } from "@/lib/decimal";
import { PAYMENT_STATUS } from "@/lib/orders";

export default async function OrdersPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; status?: string }>;
}) {
  const session = await requirePermission("orders.view");
  const { q, status } = await searchParams;
  const canCreate = hasPermission(session.user.permissions, session.user.roleCode, "orders.create");
  const ownOnly = session.user.roleCode === "sales_manager";
  const number = q && /^\d+$/.test(q) ? Number(q) : undefined;

  const [orders, statuses] = await Promise.all([
    prisma.order.findMany({
      where: {
        ...(ownOnly ? { sellerId: session.user.id } : {}),
        ...(status ? { status: { code: status } } : {}),
        ...(number
          ? { number }
          : q
            ? { customer: { name: { contains: q, mode: "insensitive" } } }
            : {}),
      },
      include: { customer: true, seller: true, status: true },
      orderBy: { number: "desc" },
      take: 100,
    }),
    prisma.orderStatus.findMany({ orderBy: { sortOrder: "asc" } }),
  ]);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
<h1 className="mt-1 text-2xl font-semibold">Заказы</h1>
        </div>
        {canCreate ? (
          <Link href="/orders/new" className="rounded-lg bg-[var(--titan-dark)] px-4 py-2 text-sm font-medium text-white">
            Новый заказ
          </Link>
        ) : null}
      </div>
      <SalesNav current="orders" />
      <form className="flex flex-wrap gap-2">
        <input
          name="q"
          defaultValue={q ?? ""}
          placeholder="Номер или клиент"
          className="rounded-lg border border-slate-200 px-3 py-2 text-sm"
        />
        <select name="status" defaultValue={status ?? ""} className="rounded-lg border border-slate-200 px-3 py-2 text-sm">
          <option value="">Все статусы</option>
          {statuses.map((s) => (
            <option key={s.id} value={s.code}>
              {s.name}
            </option>
          ))}
        </select>
        <button className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm">Найти</button>
      </form>
      <section className="overflow-hidden rounded-2xl border border-[var(--line)] bg-white">
        <table className="w-full text-left text-sm">
          <thead className="bg-slate-50 text-xs text-slate-500">
            <tr>
              <th className="px-4 py-2">№</th>
              <th className="px-4 py-2">Клиент</th>
              <th className="px-4 py-2">Статус</th>
              <th className="px-4 py-2">Оплата</th>
              <th className="px-4 py-2">Сумма</th>
              <th className="px-4 py-2">Долг</th>
              <th className="px-4 py-2">Срок</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {orders.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-4 py-8 text-slate-500">
                  Заказов нет.
                </td>
              </tr>
            ) : (
              orders.map((o) => {
                const debt = D(String(o.total)).sub(o.paidAmount);
                const overdue = o.dueAt && o.dueAt < new Date() && o.status.code !== "COMPLETED" && o.status.code !== "CANCELLED";
                return (
                  <tr key={o.id} className={overdue ? "bg-amber-50" : undefined}>
                    <td className="px-4 py-2">
                      <Link href={`/orders/${o.id}`} className="font-medium text-[var(--titan-dark)] hover:underline">
                        #{o.number}
                      </Link>
                    </td>
                    <td className="px-4 py-2">{o.customer.name}</td>
                    <td className="px-4 py-2">{o.status.name}</td>
                    <td className="px-4 py-2">
                      {PAYMENT_STATUS[o.paymentStatus as keyof typeof PAYMENT_STATUS] ?? o.paymentStatus}
                    </td>
                    <td className="px-4 py-2 font-mono text-xs">{moneyDisplay(o.total)} с</td>
                    <td className="px-4 py-2 font-mono text-xs">{moneyDisplay(debt)} с</td>
                    <td className="px-4 py-2 text-xs text-slate-500">
                      {o.dueAt ? o.dueAt.toLocaleDateString("ru-RU") : "—"}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </section>
    </div>
  );
}
