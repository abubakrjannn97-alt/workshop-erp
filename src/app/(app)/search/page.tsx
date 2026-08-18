import { getTranslator } from "@/lib/locale";
import Link from "next/link";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireSession } from "@core/auth/authz";
import { PageHeader } from "@/components/page-header";

export default async function SearchPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const { t } = await getTranslator();
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
          include: { order: { include: { customer: true } } },
          take: 10,
        }),
      ])
    : [[], [], [], [], [], []];

  if (orders.length === 1 && number) {
    redirect(`/orders/${orders[0].id}`);
  }

  return (
    <div className="page-stack">
      <PageHeader title={t("search.title")} />
      <form className="flex gap-2" data-tour="search-form">
        <input
          name="q"
          defaultValue={term}
          placeholder={t("search.ph")}
          className="w-full max-w-md rounded-lg border border-[var(--border)] px-3 py-2 text-sm"
        />
        <button className="ui-btn-primary">{t("common.search")}</button>
      </form>
      {!term ? (
        <p className="text-sm text-[var(--muted)]">{t("search.hint")}</p>
      ) : (
        <div className="space-y-4 text-sm">
          <Block
            title={t("page.orders")}
            items={orders.map((o) => ({
              href: `/orders/${o.id}`,
              label: o.customer.name,
            }))}
          />
          <Block
            title={t("page.crm")}
            items={customers.map((c) => ({
              href: `/crm/customers/${c.id}`,
              label: c.name,
            }))}
          />
          <Block title={t("search.products")} items={products.map((p) => ({ href: `/products/${p.id}`, label: p.name }))} />
          <Block title={t("page.employees")} items={users.map((u) => ({ href: `/employees/${u.id}`, label: u.name }))} />
          <Block title={t("po.suppliers")} items={suppliers.map((s) => ({ href: `/purchasing/suppliers/${s.id}`, label: s.name }))} />
          <Block
            title={t("orders.payments")}
            items={payments.map((p) => ({ href: `/orders/${p.orderId}`, label: p.order.customer.name }))}
          />
        </div>
      )}
    </div>
  );
}

function Block({ title, items }: { title: string; items: { href: string; label: string }[] }) {
  if (items.length === 0) return null;
  return (
    <section className="ui-card">
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
