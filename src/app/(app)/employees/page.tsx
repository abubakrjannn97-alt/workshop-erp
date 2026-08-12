import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/authz";
import { hasPermission } from "@/lib/authz";
import { D, moneyDisplay, qtyDisplay } from "@/lib/decimal";
import { updatePayScheme } from "@/app/actions/payroll";

export default async function EmployeesPage() {
  const session = await requirePermission("users.view");
  const canEditScheme = hasPermission(session.user.permissions, session.user.roleCode, "settings.edit");

  const [users, schemes, accruals, payouts] = await Promise.all([
    prisma.user.findMany({
      where: { archivedAt: null },
      include: { role: true, payScheme: true },
      orderBy: { name: "asc" },
    }),
    prisma.payScheme.findMany({ include: { tiers: { orderBy: { fromCount: "asc" } } }, orderBy: { name: "asc" } }),
    prisma.payrollAccrual.groupBy({
      by: ["userId"],
      where: { status: "ACCRUED" },
      _sum: { amount: true, quantity: true },
    }),
    prisma.payrollPayout.groupBy({
      by: ["userId"],
      _sum: { amount: true },
    }),
  ]);
  const accMap = new Map(accruals.map((a) => [a.userId, a]));
  const payMap = new Map(payouts.map((p) => [p.userId, p]));

  async function schemeAction(formData: FormData) {
    "use server";
    await updatePayScheme(formData);
  }

  return (
    <div className="space-y-6">
      <div>
        <p className="text-xs font-medium uppercase tracking-[0.16em] text-teal-800">PHASE 7</p>
        <h1 className="mt-1 text-2xl font-semibold">Сотрудники</h1>
        <p className="mt-1 text-sm text-slate-600">
          Схемы оплаты: 22 с/м² за годные, комиссия продавца 3/4/5% с оплат. Брак в выработку не входит.
        </p>
      </div>

      <section className="overflow-hidden rounded-2xl border border-[var(--line)] bg-white">
        <table className="w-full text-left text-sm">
          <thead className="bg-slate-50 text-xs text-slate-500">
            <tr>
              <th className="px-4 py-2">Сотрудник</th>
              <th className="px-4 py-2">Должность</th>
              <th className="px-4 py-2">Схема</th>
              <th className="px-4 py-2">Начислено</th>
              <th className="px-4 py-2">Выплачено</th>
              <th className="px-4 py-2">Долг</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {users.map((u) => {
              const acc = D(String(accMap.get(u.id)?._sum.amount ?? 0));
              const paid = D(String(payMap.get(u.id)?._sum.amount ?? 0));
              return (
                <tr key={u.id}>
                  <td className="px-4 py-2">
                    <Link href={`/employees/${u.id}`} className="font-medium text-teal-800 hover:underline">
                      {u.name}
                    </Link>
                    <p className="text-xs text-slate-500">{u.phone ?? u.email}</p>
                  </td>
                  <td className="px-4 py-2">{u.role.name}</td>
                  <td className="px-4 py-2 text-xs">{u.payScheme?.name ?? "—"}</td>
                  <td className="px-4 py-2 font-mono text-xs">{moneyDisplay(acc)} с</td>
                  <td className="px-4 py-2 font-mono text-xs">{moneyDisplay(paid)} с</td>
                  <td className="px-4 py-2 font-mono text-xs">{moneyDisplay(acc.sub(paid))} с</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </section>

      {schemes.map((scheme) => (
        <section key={scheme.id} className="rounded-2xl border border-[var(--line)] bg-white p-5">
          <h2 className="text-sm font-semibold">{scheme.name}</h2>
          <p className="text-xs text-slate-500">
            {scheme.kind}
            {scheme.productionRate ? ` · ставка ${qtyDisplay(scheme.productionRate)} с/м²` : ""}
          </p>
          {canEditScheme ? (
            <form action={schemeAction} className="mt-3 space-y-2">
              <input type="hidden" name="id" value={scheme.id} />
              {scheme.productionRate != null ? (
                <label className="block text-sm">
                  Ставка за м²
                  <input
                    name="productionRate"
                    defaultValue={String(scheme.productionRate)}
                    className="mt-1 w-40 rounded-lg border border-slate-200 px-3 py-2 text-sm"
                  />
                </label>
              ) : null}
              {scheme.kind === "SALES_COMMISSION" || scheme.kind === "MIXED" ? (
                <>
                  <label className="block text-sm">
                    Модель
                    <select
                      name="commissionMode"
                      defaultValue={scheme.commissionMode ?? "PROGRESSIVE"}
                      className="mt-1 rounded-lg border border-slate-200 px-3 py-2 text-sm"
                    >
                      <option value="PROGRESSIVE">Progressive (ступени внутри месяца)</option>
                      <option value="TIERED">Tiered (итоговый уровень на все продажи месяца)</option>
                    </select>
                  </label>
                  <input type="hidden" name="commissionBase" value={scheme.commissionBase ?? "PAID"} />
                  <p className="text-xs text-slate-500">База: фактически полученные оплаты.</p>
                  {scheme.tiers.map((t) => (
                    <div key={t.id} className="flex flex-wrap gap-2 text-sm">
                      <input name="fromCount" defaultValue={t.fromCount} className="w-20 rounded border border-slate-200 px-2 py-1" />
                      <input name="toCount" defaultValue={t.toCount ?? ""} placeholder="∞" className="w-20 rounded border border-slate-200 px-2 py-1" />
                      <input name="percent" defaultValue={String(t.percent)} className="w-20 rounded border border-slate-200 px-2 py-1" />
                      <span className="text-xs text-slate-500">зак. → %</span>
                    </div>
                  ))}
                </>
              ) : null}
              <button className="rounded-lg bg-teal-800 px-3 py-2 text-sm text-white">Сохранить схему</button>
            </form>
          ) : (
            <ul className="mt-2 text-sm">
              {scheme.tiers.map((t) => (
                <li key={t.id}>
                  {t.fromCount}–{t.toCount ?? "∞"} зак. → {String(t.percent)}%
                </li>
              ))}
            </ul>
          )}
        </section>
      ))}
    </div>
  );
}
