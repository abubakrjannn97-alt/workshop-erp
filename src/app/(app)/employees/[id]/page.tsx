import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/authz";
import { hasPermission } from "@/lib/authz";
import { D, moneyDisplay, qtyDisplay } from "@/lib/decimal";
import { assignPayScheme, payEmployee } from "@/app/actions/payroll";
import { periodKey, periodRange } from "@/lib/payroll";
import { getTranslator } from "@/lib/locale";
import { intlLocale } from "@/lib/i18n";
import { KpiCard } from "@/components/kpi-card";
import { PageHeader } from "@/components/page-header";

export default async function EmployeePage({ params }: { params: Promise<{ id: string }> }) {
  const { t, locale, n } = await getTranslator();
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
    <div className="page-stack">
      <div>
        <PageHeader title={user.name} />
        <p className="text-sm text-[var(--text-muted)]">
          {n("role", user.role.code, user.role.name)} · {user.phone ?? user.email}
          {user.hiredAt ? ` · ${t("common.from")} ${user.hiredAt.toLocaleDateString(intlLocale(locale))}` : ""}
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-4">
        <KpiCard label={t("emp.monthSales")} value={`${moneyDisplay(monthTurnover)} с`} tone="in" />
        <KpiCard label={t("emp.clientPaid")} value={`${moneyDisplay(monthPaid)} с`} tone="in" />
        <KpiCard label={t("emp.goodM2")} value={`${qtyDisplay(m2._sum.quantity ?? 0)} м²`} tone="ink" />
        <KpiCard label={t("common.debt")} value={`${moneyDisplay(debt)} с`} tone="out" />
      </div>

      {canEdit ? (
        <form action={assign} className="max-w-xl space-y-2 ui-card p-4">
          <input type="hidden" name="userId" value={user.id} />
          <h2 className="text-sm font-semibold">{t("emp.payScheme")}</h2>
          <select
            name="paySchemeId"
            defaultValue={user.paySchemeId ?? ""}
            className="w-full rounded-lg border border-[var(--border)] px-3 py-2 text-sm"
          >
            <option value="">{t("emp.noScheme")}</option>
            {schemes.map((s) => (
              <option key={s.id} value={s.id}>
                {s.kind === "SALES_COMMISSION"
                  ? t("emp.commissionTitle")
                  : s.kind === "PRODUCTION_M2"
                    ? t("emp.laborTitle")
                    : s.name}
              </option>
            ))}
          </select>
          <label className="block text-sm">
            {t("emp.hiredAt")}
            <input
              name="hiredAt"
              type="date"
              defaultValue={user.hiredAt ? user.hiredAt.toISOString().slice(0, 10) : ""}
              className="mt-1 w-full rounded-lg border border-[var(--border)] px-3 py-2 text-sm"
            />
          </label>
          <button className="ui-btn-primary">{t("common.save")}</button>
        </form>
      ) : null}

      {canPay && debt.gt(0) ? (
        <form action={payout} className="max-w-xl space-y-2 ui-card p-4">
          <input type="hidden" name="userId" value={user.id} />
          <h2 className="text-sm font-semibold">{t("emp.payout")}</h2>
          <input name="amount" defaultValue={moneyDisplay(debt)} className="w-full rounded-lg border border-[var(--border)] px-3 py-2 text-sm" />
          <select name="accountId" className="w-full rounded-lg border border-[var(--border)] px-3 py-2 text-sm">
            {accounts.map((a) => (
              <option key={a.id} value={a.id}>
                {n("cash", a.code, a.name)}
              </option>
            ))}
          </select>
          <input name="comment" placeholder={t("common.comment")} className="w-full rounded-lg border border-[var(--border)] px-3 py-2 text-sm" />
          <button className="ui-btn-primary">{t("emp.payOutBtn")}</button>
        </form>
      ) : null}

      <section className="ui-card">
        <div className="border-b border-[var(--line)] px-5 py-3">
          <h2 className="text-sm font-semibold">{t("emp.accruals")}</h2>
        </div>
        <ul className="divide-y divide-[var(--border)] text-sm">
          {accruals.length === 0 ? (
            <li className="px-5 py-6 text-[var(--muted)]">{t("emp.noneYet")}</li>
          ) : (
            accruals.map((a) => (
              <li key={a.id} className="flex justify-between px-5 py-2">
                <span>
                  {a.kind === "PRODUCTION" ? t("emp.output") : a.kind === "COMMISSION" ? t("emp.commission") : a.kind}
                  {a.comment ? ` · ${a.comment}` : ""} · {a.status === "REVERSED" ? t("common.reversal") : a.periodKey}
                </span>
                <span className="font-mono text-xs">{moneyDisplay(a.amount)} с</span>
              </li>
            ))
          )}
        </ul>
      </section>

      <p className="text-sm">
        <Link href="/employees" className="text-[var(--titan-dark)] hover:underline">
          {t("emp.allEmployees")}
        </Link>
      </p>
    </div>
  );
}
