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
import { DashPanel } from "@/components/dash-panel";
import { FormField } from "@/components/form-field";
import { DataTableSection, UiTable } from "@/components/data-table";

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

      <DataTableSection tour="emp-list">
        <UiTable>
          <table className="w-full text-left text-sm">
            <thead className="bg-[var(--surface-muted)] text-xs uppercase tracking-wide text-[var(--muted)]">
              <tr>
                <th className="px-4 py-3">{t("emp.employee")}</th>
                <th className="px-4 py-3">{t("emp.position")}</th>
                <th className="px-4 py-3">{t("emp.scheme")}</th>
                <th className="px-4 py-3">{t("emp.accrued")}</th>
                <th className="px-4 py-3">{t("emp.paidOut")}</th>
                <th className="px-4 py-3">{t("common.debt")}</th>
              </tr>
            </thead>
            <RevealList as="tbody" moreLabel={t("home.seeAll")} lessLabel={t("home.hide")} limit={5} className="divide-y divide-[var(--border)]">
              {users.map((u) => {
                const acc = D(String(accMap.get(u.id)?._sum.amount ?? 0));
                const paid = D(String(payMap.get(u.id)?._sum.amount ?? 0));
                const schemeLabel = u.payScheme
                  ? u.payScheme.kind === "SALES_COMMISSION"
                    ? t("emp.commissionTitle")
                    : u.payScheme.productionRate != null
                      ? t("emp.laborTitle")
                      : u.payScheme.name
                  : "—";
                return (
                  <tr key={u.id}>
                    <td className="px-4 py-3" data-label={t("emp.employee")}>
                      <Link href={`/employees/${u.id}`} className="font-medium text-[var(--titan-dark)] hover:underline">
                        {u.name}
                      </Link>
                      <p className="text-xs text-[var(--muted)]">
                        {u.phone ? formatPhoneDisplay(u.phone) : u.email}
                      </p>
                    </td>
                    <td className="px-4 py-3" data-label={t("emp.position")}>
                      {n("role", u.role.code, u.role.name)}
                    </td>
                    <td className="px-4 py-3 text-xs" data-label={t("emp.scheme")}>
                      {schemeLabel}
                    </td>
                    <td className="px-4 py-3 font-mono text-xs tabular-nums" data-label={t("emp.accrued")}>
                      {moneyDisplay(acc)} с
                    </td>
                    <td className="px-4 py-3 font-mono text-xs tabular-nums" data-label={t("emp.paidOut")}>
                      {moneyDisplay(paid)} с
                    </td>
                    <td className="px-4 py-3 font-mono text-xs tabular-nums" data-label={t("common.debt")}>
                      {moneyDisplay(acc.sub(paid))} с
                    </td>
                  </tr>
                );
              })}
            </RevealList>
          </table>
        </UiTable>
      </DataTableSection>

      {schemes.map((scheme) => {
        const isCommission = scheme.kind === "SALES_COMMISSION" || scheme.kind === "MIXED";
        const isLabor = scheme.productionRate != null;
        const title =
          scheme.kind === "SALES_COMMISSION"
            ? t("emp.commissionTitle")
            : scheme.productionRate != null
              ? t("emp.laborTitle")
              : scheme.name;
        const hint = isCommission ? t("emp.commissionHint") : isLabor ? t("emp.laborHint") : "";
        return (
          <DashPanel key={scheme.id} title={title}>
            {hint ? <p className="mb-3 text-sm leading-snug text-[var(--text-muted)]">{hint}</p> : null}
            {scheme.productionRate ? (
              <p className="mb-3 text-xs text-[var(--text-muted)]">
                {t("emp.currentRate", { n: qtyDisplay(scheme.productionRate) })}
              </p>
            ) : null}
            {canEditScheme ? (
              <form action={schemeAction} className="grid gap-3">
                <input type="hidden" name="id" value={scheme.id} />
                {isLabor ? (
                  <FormField label={t("emp.productionRate")} className="max-w-xs">
                    <input
                      name="productionRate"
                      inputMode="decimal"
                      defaultValue={qtyDisplay(scheme.productionRate ?? 0)}
                      className="ui-input"
                    />
                  </FormField>
                ) : null}
                {isCommission ? (
                  <>
                    <FormField label={t("emp.model")} className="max-w-xl">
                      <select
                        name="commissionMode"
                        defaultValue={scheme.commissionMode ?? "PROGRESSIVE"}
                        className="ui-input"
                      >
                        <option value="PROGRESSIVE">{t("emp.progressive")}</option>
                        <option value="TIERED">{t("emp.tiered")}</option>
                      </select>
                    </FormField>
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
                <button type="submit" className="ui-btn-primary min-h-[44px]">
                  {isCommission ? t("emp.saveCommission") : isLabor ? t("emp.saveRate") : t("emp.saveScheme")}
                </button>
              </form>
            ) : (
              <ul className="text-sm">
                {scheme.tiers.map((tier) => (
                  <li key={tier.id}>
                    {tier.fromCount}–{tier.toCount ?? "∞"} · {qtyDisplay(tier.percent)}%
                  </li>
                ))}
              </ul>
            )}
          </DashPanel>
        );
      })}
    </div>
  );
}
