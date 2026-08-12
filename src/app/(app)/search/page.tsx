import Link from "next/link";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireSession } from "@/lib/authz";

export default async function SearchPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  await requireSession();
  const { q } = await searchParams;
  const term = (q ?? "").trim();
  const number = /^\d+$/.test(term) ? Number(term) : undefined;

  const [orders, customers, products, users, suppliers, payments] = term
    ? await Promise.all([
        prisma.order.findMany({
          where: number
            ? { number }
            : { customer: { name: { contains: term, mode: "insensitive" } } },
          include: { customer: true },
          take: 10,
        }),
        prisma.customer.findMany({
          where: {
            archivedAt: null,
            OR: [
              { name: { contains: term, mode: "insensitive" } },
              { phone: { contains: term } },
            ],
          },
          take: 10,
        }),
        prisma.product.findMany({
          where: { archivedAt: null, name: { contains: term, mode: "insensitive" } },
          take: 10,
        }),
        prisma.user.findMany({
          where: {
            archivedAt: null,
            OR: [{ name: { contains: term, mode: "insensitive" } }, { email: { contains: term, mode: "insensitive" } }],
          },
          take: 10,
        }),
        prisma.supplier.findMany({
          where: { archivedAt: null, name: { contains: term, mode: "insensitive" } },
          take: 10,
        }),
        prisma.payment.findMany({
          where: number ? { order: { number } } : undefined,
          include: { order: true },
          take: 10,
        }),
      ])
    : [[], [], [], [], [], []];

  if (orders.length === 1 && number) {
    redirect(`/orders/${orders[0].id}`);
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">Поиск</h1>
      <form className="flex gap-2">
        <input
          name="q"
          defaultValue={term}
          placeholder="Заказ, клиент, телефон, изделие…"
          className="w-full max-w-md rounded-lg border border-slate-200 px-3 py-2 text-sm"
        />
        <button className="rounded-lg bg-[var(--titan-dark)] px-3 py-2 text-sm text-white">Найти</button>
      </form>
      {!term ? (
        <p className="text-sm text-slate-500">Например, 1054 — откроет заказ.</p>
      ) : (
        <div className="space-y-4 text-sm">
          <Block title="Заказы" items={orders.map((o) => ({ href: `/orders/${o.id}`, label: `#${o.number} ${o.customer.name}` }))} />
          <Block title="Клиенты" items={customers.map((c) => ({ href: `/crm/customers/${c.id}`, label: `${c.name} ${c.phone ?? ""}` }))} />
          <Block title="Изделия" items={products.map((p) => ({ href: `/products/${p.id}`, label: p.name }))} />
          <Block title="Сотрудники" items={users.map((u) => ({ href: `/employees/${u.id}`, label: u.name }))} />
          <Block title="Поставщики" items={suppliers.map((s) => ({ href: `/purchasing/suppliers/${s.id}`, label: s.name }))} />
          <Block
            title="Оплаты"
            items={payments.map((p) => ({ href: `/orders/${p.orderId}`, label: `Заказ #${p.order.number}` }))}
          />
        </div>
      )}
    </div>
  );
}

function Block({ title, items }: { title: string; items: { href: string; label: string }[] }) {
  if (items.length === 0) return null;
  return (
    <section className="rounded-2xl border border-[var(--line)] bg-white p-5">
      <h2 className="text-sm font-semibold">{title}</h2>
      <ul className="mt-2 space-y-1">
        {items.map((i) => (
          <li key={i.href + i.label}>
            <Link href={i.href} className="text-[var(--titan-dark)] hover:underline">
              {i.label}
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
