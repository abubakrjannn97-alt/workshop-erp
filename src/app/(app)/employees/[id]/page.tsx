import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/authz";
import { hasPermission } from "@/lib/authz";
import { D, moneyDisplay, qtyDisplay } from "@/lib/decimal";
import { assignPayScheme, payEmployee } from "@/app/actions/payroll";
import { periodKey, periodRange } from "@/lib/payroll";

export default async function EmployeePage({ params }: { params: Promise<{ id: string }> }) {
  const session = await requirePermission("users.view");
  const { id } = await params;
  const user = await prisma.user.findUnique({
    where: { id },
    include: {
      role: true,
      payScheme: { include: { tiers: { orderBy: { fromCount: "asc" } } } },
      soldOrders: { include: { status: true } },
    },
  });
  if (!user || user.archivedAt) notFound();

  const canEdit = hasPermission(session.user.permissions, session.user.roleCode, "users.edit");
  const canPay = hasPermission(session.user.permissions, session.user.roleCode, "salary.approve");
  const key = periodKey();
  const { start, end } = periodRange(key);

  const [schemes, accounts, accruals, payouts, m2, accruedAgg, paidAgg] = await Promise.all([
    prisma.payScheme.findMany({ orderBy: { name: "asc" } }),
    prisma.cashAccount.findMany({ where: { archivedAt: null } }),
    prisma.payrollAccrual.findMany({
      where: { userId: id },
      orderBy: { createdAt: "desc" },
      take: 40,
    }),
    prisma.payrollPayout.findMany({ where: { userId: id }, orderBy: { createdAt: "desc" }, take: 20 }),
    prisma.payrollAccrual.aggregate({
      where: { userId: id, kind: "PRODUCTION", status: "ACCRUED" },
      _sum: { quantity: true, amount: true },
    }),
    prisma.payrollAccrual.aggregate({
      where: { userId: id, status: "ACCRUED" },
      _sum: { amount: true },
    }),
    prisma.payrollPayout.aggregate({ where: { userId: id }, _sum: { amount: true } }),
  ]);

  const accrued = D(String(accruedAgg._sum.amount ?? 0));
  const paid = D(String(paidAgg._sum.amount ?? 0));
  const debt = accrued.sub(paid);
  const monthSales = user.soldOrders.filter(
    (o) => o.createdAt >= start && o.createdAt < end && o.status.code !== "CANCELLED",
  );
  const monthTurnover = monthSales.reduce((s, o) => s.add(String(o.total)), D(0));
  const monthPaid = monthSales.reduce((s, o) => s.add(String(o.paidAmount)), D(0));

  async function assign(formData: FormData) {
    "use server";
    await assignPayScheme(formData);
  }
  async function payout(formData: FormData) {
    "use server";
    await payEmployee(formData);
  }

  return (
    <div className="space-y-6">
      <div>
        <p className="text-xs font-medium uppercase tracking-[0.16em] text-teal-800">PHASE 7</p>
        <h1 className="mt-1 text-2xl font-semibold">{user.name}</h1>
        <p className="text-sm text-slate-600">
          {user.role.name} · {user.phone ?? user.email}
          {user.hiredAt ? ` · с ${user.hiredAt.toLocaleDateString("ru-RU")}` : ""}
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-4">
        <Stat label="Продажи месяца" value={`${moneyDisplay(monthTurnover)} с`} />
        <Stat label="Оплачено клиентами" value={`${moneyDisplay(monthPaid)} с`} />
        <Stat label="Годных м²" value={qtyDisplay(m2._sum.quantity ?? 0)} />
        <Stat label="Задолженность" value={`${moneyDisplay(debt)} с`} />
      </div>

      {canEdit ? (
        <form action={assign} className="max-w-xl space-y-2 rounded-2xl border border-[var(--line)] bg-white p-5">
          <input type="hidden" name="userId" value={user.id} />
          <h2 className="text-sm font-semibold">Схема оплаты</h2>
          <select
            name="paySchemeId"
            defaultValue={user.paySchemeId ?? ""}
            className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
          >
            <option value="">Без схемы</option>
            {schemes.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
          <label className="block text-sm">
            Дата начала работы
            <input
              name="hiredAt"
              type="date"
              defaultValue={user.hiredAt ? user.hiredAt.toISOString().slice(0, 10) : ""}
              className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
            />
          </label>
          <button className="rounded-lg bg-teal-800 px-3 py-2 text-sm text-white">Сохранить</button>
        </form>
      ) : null}

      {canPay && debt.gt(0) ? (
        <form action={payout} className="max-w-xl space-y-2 rounded-2xl border border-[var(--line)] bg-white p-5">
          <input type="hidden" name="userId" value={user.id} />
          <h2 className="text-sm font-semibold">Выплата</h2>
          <input name="amount" defaultValue={moneyDisplay(debt)} className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm" />
          <select name="accountId" className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm">
            {accounts.map((a) => (
              <option key={a.id} value={a.id}>
                {a.name}
              </option>
            ))}
          </select>
          <input name="comment" placeholder="Комментарий" className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm" />
          <button className="rounded-lg bg-teal-800 px-3 py-2 text-sm text-white">Выплатить</button>
        </form>
      ) : null}

      <section className="rounded-2xl border border-[var(--line)] bg-white">
        <div className="border-b border-[var(--line)] px-5 py-3">
          <h2 className="text-sm font-semibold">Начисления</h2>
        </div>
        <ul className="divide-y divide-slate-100 text-sm">
          {accruals.length === 0 ? (
            <li className="px-5 py-6 text-slate-500">Пока нет.</li>
          ) : (
            accruals.map((a) => (
              <li key={a.id} className="flex justify-between px-5 py-2">
                <span>
                  {a.kind === "PRODUCTION" ? "Выработка" : a.kind === "COMMISSION" ? "Комиссия" : a.kind}
                  {a.comment ? ` · ${a.comment}` : ""} · {a.status === "REVERSED" ? "сторно" : a.periodKey}
                </span>
                <span className="font-mono text-xs">{moneyDisplay(a.amount)} с</span>
              </li>
            ))
          )}
        </ul>
      </section>

      <p className="text-sm">
        <Link href="/employees" className="text-teal-800 hover:underline">
          Все сотрудники
        </Link>
      </p>
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
