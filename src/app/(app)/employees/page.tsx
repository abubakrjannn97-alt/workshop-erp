import { PageHeader } from "@/components/page-header";
import { getTranslator } from "@core/shared/i18n/locale";
import Link from "next/link";
import { prisma } from "@core/infrastructure/prisma";
import { requirePermission } from "@core/auth/authz";
import { hasPermission } from "@core/auth/authz";
import { D, moneyDisplay, qtyDisplay } from "@core/shared/decimal";
import { updatePayScheme } from "@/app/actions/payroll";
import { RevealList } from "@/components/reveal-list";
import { AddEmployeeForm } from "@/components/add-employee-form";
import { EMPLOYEE_ASSIGNABLE, type PermissionCode } from "@core/rbac/permissions";
import { formatPhoneDisplay } from "@core/shared/phone";

export default async function EmployeesPage() {
  const { t, locale, n } = await getTranslator();
  const session = await requirePermission("users.view");
  const isOwner = session.user.roleCode === "owner";
  const canEditScheme = hasPermission(session.user.permissions, session.user.roleCode, "settings.edit");

  const [users, schemes, accruals, payouts, assignablePerms] = await Promise.all([
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
    isOwner
      ? prisma.permission.findMany({
          where: { code: { in: [...EMPLOYEE_ASSIGNABLE] } },
          orderBy: [{ module: "asc" }, { code: "asc" }],
        })
      : Promise.resolve([]),
  ]);
  const accMap = new Map(accruals.map((a) => [a.userId, a]));
  const payMap = new Map(payouts.map((p) => [p.userId, p]));
  const permModules = [...new Set(assignablePerms.map((p) => p.module))];

  async function schemeAction(formData: FormData) {
    "use server";
    await updatePayScheme(formData);
  }

  return (
    <div className="page-stack">
      <PageHeader title={t("page.employees")} description={t("emp.hint")} />

      {isOwner ? (
        <AddEmployeeForm
          locale={locale}
          permissions={assignablePerms.map((p) => ({
            id: p.id,
            code: p.code as PermissionCode,
            module: p.module,
          }))}
          modules={permModules}
        />
      ) : null}

      <section className="overflow-hidden ui-card" data-tour="emp-list">
        <table className="w-full text-left text-sm">
          <thead className="bg-[var(--surface-muted)] text-xs text-[var(--muted)]">
            <tr>
              <th className="px-4 py-2">{t("emp.employee")}</th>
              <th className="px-4 py-2">{t("emp.position")}</th>
              <th className="px-4 py-2">{t("emp.scheme")}</th>
              <th className="px-4 py-2">{t("emp.accrued")}</th>
              <th className="px-4 py-2">{t("emp.paidOut")}</th>
              <th className="px-4 py-2">{t("common.debt")}</th>
            </tr>
          </thead>
          <RevealList as="tbody" moreLabel={t("home.seeAll")} lessLabel={t("home.hide")} limit={5} className="divide-y divide-[var(--border)]">
            {users.map((u) => {
              const acc = D(String(accMap.get(u.id)?._sum.amount ?? 0));
              const paid = D(String(payMap.get(u.id)?._sum.amount ?? 0));
              return (
                <tr key={u.id}>
                  <td className="px-4 py-2">
                    <Link href={`/employees/${u.id}`} className="font-medium text-[var(--titan-dark)] hover:underline">
                      {u.name}
                    </Link>
                    <p className="text-xs text-[var(--muted)]">
                      {u.phone ? formatPhoneDisplay(u.phone) : u.email}
                    </p>
                  </td>
                  <td className="px-4 py-2">{n("role", u.role.code, u.role.name)}</td>
                  <td className="px-4 py-2 text-xs">
                    {u.payScheme
                      ? u.payScheme.kind === "SALES_COMMISSION"
                        ? t("emp.commissionTitle")
                        : u.payScheme.kind === "PRODUCTION_M2"
                          ? t("emp.laborTitle")
                          : u.payScheme.name
                      : "—"}
                  </td>
                  <td className="px-4 py-2 font-mono text-xs">{moneyDisplay(acc)} с</td>
                  <td className="px-4 py-2 font-mono text-xs">{moneyDisplay(paid)} с</td>
                  <td className="px-4 py-2 font-mono text-xs">{moneyDisplay(acc.sub(paid))} с</td>
                </tr>
              );
            })}
          </RevealList>
        </table>
      </section>

      {schemes.map((scheme) => {
        const isCommission = scheme.kind === "SALES_COMMISSION" || scheme.kind === "MIXED";
        const isLabor = scheme.productionRate != null;
        const title =
          scheme.kind === "SALES_COMMISSION"
            ? t("emp.commissionTitle")
            : scheme.kind === "PRODUCTION_M2"
              ? t("emp.laborTitle")
              : scheme.name;
        const hint = isCommission ? t("emp.commissionHint") : isLabor ? t("emp.laborHint") : "";
        return (
        <section key={scheme.id} className="ui-card p-4">
          <h2 className="text-sm font-semibold">{title}</h2>
          <p className="mt-1 text-sm leading-snug text-[var(--text-muted)]">{hint}</p>
          {scheme.productionRate ? (
            <p className="mt-1 text-xs text-[var(--text-muted)]">
              {t("emp.currentRate", { n: qtyDisplay(scheme.productionRate) })}
            </p>
          ) : null}
          {canEditScheme ? (
            <form action={schemeAction} className="mt-3 space-y-3">
              <input type="hidden" name="id" value={scheme.id} />
              {isLabor ? (
                <label className="block min-w-0 text-sm">
                  <span className="ui-label mb-1">{t("emp.rateM2")}</span>
                  <span className="block w-40">
                    <input
                      name="productionRate"
                      inputMode="decimal"
                      defaultValue={qtyDisplay(scheme.productionRate ?? 0)}
                      className="ui-input"
                    />
                  </span>
                </label>
              ) : null}
              {isCommission ? (
                <>
                  <label className="block min-w-0 text-sm">
                    <span className="ui-label mb-1">{t("emp.model")}</span>
                    <select
                      name="commissionMode"
                      defaultValue={scheme.commissionMode ?? "PROGRESSIVE"}
                      className="ui-input max-w-xl"
                    >
                      <option value="PROGRESSIVE">{t("emp.progressive")}</option>
                      <option value="TIERED">{t("emp.tiered")}</option>
                    </select>
                  </label>
                  <input type="hidden" name="commissionBase" value={scheme.commissionBase ?? "PAID"} />
                  <p className="text-sm text-[var(--text-muted)]">{t("emp.basePaid")}</p>
                  <div className="overflow-x-auto">
                    <div className="mb-1 grid min-w-[20rem] grid-cols-3 gap-2 text-xs font-semibold text-[#344054]">
                      <span>{t("emp.fromOrders")}</span>
                      <span>{t("emp.toOrders")}</span>
                      <span>{t("emp.percent")}</span>
                    </div>
                    {scheme.tiers.map((tier) => (
                      <div key={tier.id} className="mb-2 grid min-w-[20rem] grid-cols-3 gap-2">
                        <input name="fromCount" defaultValue={tier.fromCount} inputMode="numeric" className="ui-input" />
                        <input name="toCount" defaultValue={tier.toCount ?? ""} placeholder="∞" inputMode="numeric" className="ui-input" />
                        <input name="percent" defaultValue={qtyDisplay(tier.percent)} inputMode="decimal" className="ui-input" />
                      </div>
                    ))}
                  </div>
                </>
              ) : null}
              <button className="ui-btn-primary">
                {isCommission ? t("emp.saveCommission") : isLabor ? t("emp.saveRate") : t("emp.saveScheme")}
              </button>
            </form>
          ) : (
            <ul className="mt-2 text-sm">
              {scheme.tiers.map((tier) => (
                <li key={tier.id}>
                  {tier.fromCount}–{tier.toCount ?? "∞"} · {qtyDisplay(tier.percent)}%
                </li>
              ))}
            </ul>
          )}
        </section>
        );
      })}
    </div>
  );
}
