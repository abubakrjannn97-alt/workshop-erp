import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/authz";
import { hasPermission } from "@/lib/authz";
import { SalesNav } from "@/components/sales-nav";
import { D, moneyDisplay } from "@/lib/decimal";
import { PAYMENT_STATUS } from "@/lib/orders";

export default async function SalesPage() {
  const session = await requirePermission("orders.view");
  const canCreate = hasPermission(session.user.permissions, session.user.roleCode, "orders.create");
  const own = session.user.roleCode === "sales_manager" ? { sellerId: session.user.id } : {};
  const crmOwn = session.user.roleCode === "sales_manager" ? { managerId: session.user.id } : {};

  const [orders, unpaid, overdue, leads] = await Promise.all([
    prisma.order.findMany({
      where: own,
      include: { customer: true, status: true },
      orderBy: { createdAt: "desc" },
      take: 12,
    }),
    prisma.order.findMany({
      where: { ...own, paymentStatus: { in: ["unpaid", "partial"] }, status: { code: { not: "CANCELLED" } } },
      include: { customer: true },
      orderBy: { createdAt: "desc" },
      take: 20,
    }),
    prisma.order.findMany({
      where: {
        ...own,
        dueAt: { lt: new Date() },
        status: { code: { notIn: ["COMPLETED", "CANCELLED", "ISSUED"] } },
      },
      include: { customer: true, status: true },
      take: 20,
    }),
    prisma.lead.count({ where: { archivedAt: null, ...crmOwn, stage: { isWon: false, isLost: false } } }),
  ]);

  const monthStart = new Date();
  monthStart.setDate(1);
  monthStart.setHours(0, 0, 0, 0);
  const monthOrders = await prisma.order.findMany({
    where: { ...own, createdAt: { gte: monthStart }, status: { code: { not: "CANCELLED" } } },
  });
  const monthTotal = monthOrders.reduce((s, o) => s.add(String(o.total)), D(0));

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-xs font-medium uppercase tracking-[0.16em] text-teal-800">PHASE 4</p>
          <h1 className="mt-1 text-2xl font-semibold">Продажи</h1>
        </div>
        {canCreate ? (
          <Link href="/orders/new" className="rounded-lg bg-teal-800 px-4 py-2 text-sm font-medium text-white">
            Новый заказ
          </Link>
        ) : null}
      </div>
      <SalesNav current="sales" />

      <div className="grid gap-4 sm:grid-cols-3">
        <Stat label="Продажи за месяц" value={`${moneyDisplay(monthTotal)} с`} />
        <Stat label="Неоплаченные" value={String(unpaid.length)} />
        <Stat label="Лиды в работе" value={String(leads)} />
      </div>

      {overdue.length > 0 ? (
        <section className="rounded-2xl border border-amber-200 bg-amber-50 p-5">
          <h2 className="text-sm font-semibold">Просроченные заказы</h2>
          <ul className="mt-2 space-y-1 text-sm">
            {overdue.map((o) => (
              <li key={o.id}>
                <Link href={`/orders/${o.id}`} className="text-teal-800 hover:underline">
                  #{o.number}
                </Link>{" "}
                {o.customer.name} · {o.status.name} · до {o.dueAt?.toLocaleDateString("ru-RU")}
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      <section className="rounded-2xl border border-[var(--line)] bg-white">
        <div className="border-b border-[var(--line)] px-5 py-3">
          <h2 className="text-sm font-semibold">Долги клиентов</h2>
        </div>
        <ul className="divide-y divide-slate-100">
          {unpaid.length === 0 ? (
            <li className="px-5 py-6 text-sm text-slate-500">Долгов нет.</li>
          ) : (
            unpaid.map((o) => (
              <li key={o.id} className="flex justify-between px-5 py-3 text-sm">
                <Link href={`/orders/${o.id}`} className="hover:underline">
                  #{o.number} {o.customer.name}
                </Link>
                <span className="font-mono text-xs">
                  {moneyDisplay(D(String(o.total)).sub(o.paidAmount))} с ·{" "}
                  {PAYMENT_STATUS[o.paymentStatus as keyof typeof PAYMENT_STATUS]}
                </span>
              </li>
            ))
          )}
        </ul>
      </section>

      <section className="rounded-2xl border border-[var(--line)] bg-white">
        <div className="border-b border-[var(--line)] px-5 py-3">
          <h2 className="text-sm font-semibold">Последние заказы</h2>
        </div>
        <ul className="divide-y divide-slate-100">
          {orders.map((o) => (
            <li key={o.id} className="flex justify-between px-5 py-3 text-sm">
              <Link href={`/orders/${o.id}`} className="hover:underline">
                #{o.number} {o.customer.name}
              </Link>
              <span>
                {o.status.name} · {moneyDisplay(o.total)} с
              </span>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-[var(--line)] bg-white p-5">
      <p className="text-xs text-slate-500">{label}</p>
      <p className="mt-2 text-2xl font-semibold">{value}</p>
    </div>
  );
}
