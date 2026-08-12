import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/authz";
import { hasPermission } from "@/lib/authz";
import { decideApproval, closePeriod } from "@/app/actions/control";
import Link from "next/link";

export default async function ApprovalsPage() {
  const session = await requirePermission("audit.view");
  const canDecide = hasPermission(session.user.permissions, session.user.roleCode, "approvals.decide");
  const [pending, recent, periods] = await Promise.all([
    prisma.approvalRequest.findMany({ where: { status: "PENDING" }, orderBy: { createdAt: "desc" } }),
    prisma.approvalRequest.findMany({ where: { status: { not: "PENDING" } }, orderBy: { createdAt: "desc" }, take: 20 }),
    prisma.accountingPeriod.findMany({ orderBy: [{ year: "desc" }, { month: "desc" }], take: 12 }),
  ]);
  const now = new Date();

  async function decide(formData: FormData) {
    "use server";
    await decideApproval(formData);
  }
  async function close(formData: FormData) {
    "use server";
    await closePeriod(formData);
  }

  return (
    <div className="space-y-6">
      <div>
<h1 className="mt-1 text-2xl font-semibold">Согласования и период</h1>
      </div>
      <Link href="/settings" className="text-sm text-[var(--titan-dark)] hover:underline">
        ← Настройки
      </Link>

      <section className="rounded-2xl border border-[var(--line)] bg-white p-5">
        <h2 className="text-sm font-semibold">Ожидают решения</h2>
        <ul className="mt-3 space-y-3 text-sm">
          {pending.length === 0 ? (
            <li className="text-slate-500">Нет заявок.</li>
          ) : (
            pending.map((a) => (
              <li key={a.id} className="rounded-lg border border-slate-100 p-3">
                <p className="font-medium">{a.title}</p>
                <p className="text-xs text-slate-500">
                  {a.type} · {a.createdAt.toLocaleString("ru-RU")}
                  {a.reason ? ` · ${a.reason}` : ""}
                </p>
                {canDecide ? (
                  <div className="mt-2 flex gap-2">
                    <form action={decide}>
                      <input type="hidden" name="id" value={a.id} />
                      <input type="hidden" name="decision" value="APPROVED" />
                      <button className="rounded-lg bg-[var(--titan-dark)] px-3 py-1 text-xs text-white">Подтвердить</button>
                    </form>
                    <form action={decide}>
                      <input type="hidden" name="id" value={a.id} />
                      <input type="hidden" name="decision" value="REJECTED" />
                      <button className="rounded-lg border border-red-200 px-3 py-1 text-xs text-red-800">Отклонить</button>
                    </form>
                  </div>
                ) : null}
              </li>
            ))
          )}
        </ul>
      </section>

      {canDecide ? (
        <form action={close} className="flex flex-wrap items-end gap-2 rounded-2xl border border-[var(--line)] bg-white p-5">
          <h2 className="w-full text-sm font-semibold">Закрытие периода</h2>
          <input
            name="year"
            defaultValue={String(now.getFullYear())}
            className="w-24 rounded-lg border border-slate-200 px-3 py-2 text-sm"
          />
          <input
            name="month"
            defaultValue={String(now.getMonth() + 1)}
            className="w-20 rounded-lg border border-slate-200 px-3 py-2 text-sm"
          />
          <button className="rounded-lg bg-[var(--titan-dark)] px-3 py-2 text-sm text-white">Закрыть месяц</button>
          <ul className="w-full text-xs text-slate-500">
            {periods.map((p) => (
              <li key={p.id}>
                {p.month}.{p.year}: {p.status}
              </li>
            ))}
          </ul>
        </form>
      ) : null}

      <section className="rounded-2xl border border-[var(--line)] bg-white p-5">
        <h2 className="text-sm font-semibold">История</h2>
        <ul className="mt-3 space-y-2 text-sm">
          {recent.map((a) => (
            <li key={a.id}>
              {a.status} · {a.title}
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
