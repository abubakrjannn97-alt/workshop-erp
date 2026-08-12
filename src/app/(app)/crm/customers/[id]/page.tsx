import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/authz";
import { hasPermission } from "@/lib/authz";
import { SalesNav } from "@/components/sales-nav";
import { archiveCustomer, updateCustomer } from "@/app/actions/customers";
import { D, moneyDisplay } from "@/lib/decimal";
import { PAYMENT_STATUS } from "@/lib/orders";

export default async function CustomerPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await requirePermission("crm.view");
  const { id } = await params;
  const customer = await prisma.customer.findUnique({
    where: { id },
    include: {
      manager: true,
      orders: { include: { status: true }, orderBy: { createdAt: "desc" } },
    },
  });
  if (!customer) notFound();
  if (session.user.roleCode === "sales_manager" && customer.managerId !== session.user.id) {
    redirect("/crm");
  }

  const canManage = hasPermission(session.user.permissions, session.user.roleCode, "crm.manage");
  const turnover = customer.orders.reduce((s, o) => s.add(String(o.total)), D(0));
  const debt = customer.orders.reduce((s, o) => s.add(D(String(o.total)).sub(o.paidAmount)), D(0));
  const avg = customer.orders.length ? turnover.div(customer.orders.length) : D(0);
  const last = customer.orders[0];

  async function save(formData: FormData) {
    "use server";
    await updateCustomer(formData);
  }
  async function archive(formData: FormData) {
    "use server";
    await archiveCustomer(formData);
    redirect("/crm");
  }

  return (
    <div className="space-y-6">
      <div>
        <p className="text-xs font-medium uppercase tracking-[0.16em] text-teal-800">PHASE 4</p>
        <h1 className="mt-1 text-2xl font-semibold">{customer.name}</h1>
      </div>
      <SalesNav current="crm" />

      <div className="grid gap-4 sm:grid-cols-4">
        <Stat label="Покупки" value={`${moneyDisplay(turnover)} с`} />
        <Stat label="Задолженность" value={`${moneyDisplay(debt)} с`} />
        <Stat label="Средний чек" value={`${moneyDisplay(avg)} с`} />
        <Stat label="Последняя покупка" value={last ? `#${last.number}` : "—"} />
      </div>

      {canManage && !customer.archivedAt ? (
        <form action={save} className="max-w-xl space-y-2 rounded-2xl border border-[var(--line)] bg-white p-5">
          <input type="hidden" name="id" value={customer.id} />
          <Field name="name" label="ФИО / компания" defaultValue={customer.name} />
          <Field name="phone" label="Телефон" defaultValue={customer.phone ?? ""} />
          <Field name="whatsapp" label="WhatsApp" defaultValue={customer.whatsapp ?? ""} />
          <Field name="address" label="Адрес" defaultValue={customer.address ?? ""} />
          <Field name="source" label="Источник" defaultValue={customer.source ?? ""} />
          <label className="block text-sm">
            <span className="font-medium">Комментарий</span>
            <textarea
              name="comment"
              defaultValue={customer.comment ?? ""}
              className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
            />
          </label>
          <div className="flex gap-2">
            <button className="rounded-lg bg-teal-800 px-3 py-2 text-sm text-white">Сохранить</button>
          </div>
        </form>
      ) : null}

      {canManage && !customer.archivedAt ? (
        <form action={archive}>
          <input type="hidden" name="id" value={customer.id} />
          <button className="text-sm text-red-800 hover:underline">Архивировать</button>
        </form>
      ) : null}

      <section className="rounded-2xl border border-[var(--line)] bg-white">
        <div className="border-b border-[var(--line)] px-5 py-3">
          <h2 className="text-sm font-semibold">История заказов</h2>
        </div>
        <ul className="divide-y divide-slate-100">
          {customer.orders.length === 0 ? (
            <li className="px-5 py-6 text-sm text-slate-500">Заказов нет.</li>
          ) : (
            customer.orders.map((o) => (
              <li key={o.id} className="flex items-center justify-between px-5 py-3 text-sm">
                <Link href={`/orders/${o.id}`} className="font-medium hover:underline">
                  #{o.number} · {o.status.name}
                </Link>
                <span className="font-mono text-xs">
                  {moneyDisplay(o.total)} с ·{" "}
                  {PAYMENT_STATUS[o.paymentStatus as keyof typeof PAYMENT_STATUS] ?? o.paymentStatus}
                </span>
              </li>
            ))
          )}
        </ul>
      </section>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-[var(--line)] bg-white p-5">
      <p className="text-xs text-slate-500">{label}</p>
      <p className="mt-2 text-lg font-semibold">{value}</p>
    </div>
  );
}

function Field({ name, label, defaultValue }: { name: string; label: string; defaultValue: string }) {
  return (
    <label className="block text-sm">
      <span className="font-medium">{label}</span>
      <input name={name} defaultValue={defaultValue} className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm" />
    </label>
  );
}
