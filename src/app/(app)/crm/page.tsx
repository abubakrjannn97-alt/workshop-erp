import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/authz";
import { hasPermission } from "@/lib/authz";
import { SalesNav } from "@/components/sales-nav";
import { createCustomer } from "@/app/actions/customers";
import { createLead, moveLead } from "@/app/actions/leads";
import { PipelineCard } from "./pipeline-card";
import { D, moneyDisplay } from "@/lib/decimal";

export default async function CrmPage() {
  const session = await requirePermission("crm.view");
  const canManage = hasPermission(session.user.permissions, session.user.roleCode, "crm.manage");
  const own = session.user.roleCode === "sales_manager" ? { managerId: session.user.id } : {};

  const [customers, stages, leads] = await Promise.all([
    prisma.customer.findMany({
      where: { archivedAt: null, ...own },
      include: { orders: true, manager: { select: { name: true } } },
      orderBy: { name: "asc" },
    }),
    prisma.leadStage.findMany({ orderBy: { sortOrder: "asc" } }),
    prisma.lead.findMany({
      where: { archivedAt: null, ...own },
      include: { stage: true },
      orderBy: { updatedAt: "desc" },
    }),
  ]);

  async function customerAction(formData: FormData) {
    "use server";
    await createCustomer(formData);
  }
  async function leadAction(formData: FormData) {
    "use server";
    await createLead(formData);
  }
  async function moveAction(formData: FormData) {
    "use server";
    await moveLead(formData);
  }

  return (
    <div className="space-y-6">
      <div>
        <p className="text-xs font-medium uppercase tracking-[0.16em] text-teal-800">PHASE 4</p>
        <h1 className="mt-1 text-2xl font-semibold">CRM</h1>
      </div>
      <SalesNav current="crm" />

      {canManage ? (
        <div className="grid gap-4 lg:grid-cols-2">
          <form action={customerAction} className="space-y-2 rounded-2xl border border-[var(--line)] bg-white p-5">
            <h2 className="text-sm font-semibold">Новый клиент</h2>
            <input name="name" required placeholder="ФИО / компания" className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm" />
            <input name="phone" placeholder="Телефон" className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm" />
            <input name="whatsapp" placeholder="WhatsApp" className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm" />
            <input name="address" placeholder="Адрес" className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm" />
            <input name="source" placeholder="Источник" className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm" />
            <textarea name="comment" placeholder="Комментарий" className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm" />
            <button className="rounded-lg bg-teal-800 px-3 py-2 text-sm text-white">Сохранить</button>
          </form>
          <form action={leadAction} className="space-y-2 rounded-2xl border border-[var(--line)] bg-white p-5">
            <h2 className="text-sm font-semibold">Новый лид</h2>
            <input name="name" required placeholder="Имя" className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm" />
            <input name="phone" placeholder="Телефон" className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm" />
            <select name="customerId" className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm">
              <option value="">Без карточки клиента</option>
              {customers.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
            <textarea name="comment" placeholder="Комментарий" className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm" />
            <button className="rounded-lg bg-teal-800 px-3 py-2 text-sm text-white">В воронку</button>
          </form>
        </div>
      ) : null}

      <section>
        <h2 className="mb-3 text-sm font-semibold">Воронка</h2>
        <div className="flex gap-3 overflow-x-auto pb-2">
          {stages.map((stage) => {
            const column = leads.filter((l) => l.stageId === stage.id);
            return (
              <div key={stage.id} className="w-56 shrink-0 rounded-2xl border border-[var(--line)] bg-white p-3">
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                  {stage.name} · {column.length}
                </p>
                <div className="mt-2 space-y-2">
                  {column.map((lead) => (
                    <div key={lead.id}>
                      {canManage ? (
                        <PipelineCard
                          lead={{ id: lead.id, name: lead.name, phone: lead.phone, stageId: lead.stageId }}
                          stages={stages}
                          action={moveAction}
                        />
                      ) : (
                        <div className="rounded-lg border border-slate-100 bg-slate-50 p-3 text-sm">
                          <p className="font-medium">{lead.name}</p>
                        </div>
                      )}
                      {canManage && !stage.isLost ? (
                        <Link
                          href={`/orders/new?leadId=${lead.id}`}
                          className="mt-1 inline-block text-[11px] text-teal-800 hover:underline"
                        >
                          Создать заказ
                        </Link>
                      ) : null}
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </section>

      <section className="rounded-2xl border border-[var(--line)] bg-white">
        <div className="border-b border-[var(--line)] px-5 py-3">
          <h2 className="text-sm font-semibold">Клиенты</h2>
        </div>
        <ul className="divide-y divide-slate-100">
          {customers.length === 0 ? (
            <li className="px-5 py-6 text-sm text-slate-500">Клиентов нет.</li>
          ) : (
            customers.map((c) => {
              const turnover = c.orders.reduce((s, o) => s.add(String(o.total)), D(0));
              const debt = c.orders.reduce((s, o) => s.add(D(String(o.total)).sub(o.paidAmount)), D(0));
              return (
                <li key={c.id} className="flex items-center justify-between px-5 py-3 text-sm">
                  <div>
                    <Link href={`/crm/customers/${c.id}`} className="font-medium hover:underline">
                      {c.name}
                    </Link>
                    <p className="text-xs text-slate-500">
                      {c.phone ?? "нет телефона"} · {c.manager?.name ?? "без менеджера"}
                    </p>
                  </div>
                  <div className="text-right font-mono text-xs">
                    <p>{moneyDisplay(turnover)} с</p>
                    <p className="text-slate-500">долг {moneyDisplay(debt)}</p>
                  </div>
                </li>
              );
            })
          )}
        </ul>
      </section>
    </div>
  );
}
