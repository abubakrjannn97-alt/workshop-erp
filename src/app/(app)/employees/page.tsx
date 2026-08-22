import { getTranslator } from "@core/shared/i18n/locale";
import Link from "next/link";
import { prisma } from "@core/infrastructure/prisma";
import { requirePermission, hasPermission } from "@core/auth/authz";
import { D, moneyDisplay, qtyDisplay } from "@core/shared/decimal";
import { updatePayScheme } from "@/app/actions/payroll";
import { AddEmployeeForm } from "@/components/add-employee-form";
import { EMPLOYEE_ASSIGNABLE, type PermissionCode } from "@core/rbac/permissions";
import { formatPhoneDisplay } from "@core/shared/phone";
import { CommissionSchemeSection } from "@/components/commission-scheme-section";
import { FormField } from "@/components/form-field";
import { AppSelect } from "@/components/app-select";
import { ChevronRight } from "lucide-react";
import { ICON_STROKE } from "@/components/nav-icons";
import styles from "./employees.module.css";

export default async function EmployeesPage() {
  const { t, locale, n } = await getTranslator();
  const session = await requirePermission("users.view");
  const isOwner = session.user.roleCode === "owner";
  const canEditScheme = hasPermission(session.user.permissions, session.user.roleCode, "settings.edit");

  const [users, schemes, accruals, payouts, assignablePerms] = await Promise.all([
    prisma.user.findMany({
      where: { archivedAt: null, role: { code: { not: "owner" } } },
      include: { role: true, payScheme: true },
      orderBy: { name: "asc" },
    }),
    prisma.payScheme.findMany({ include: { tiers: { orderBy: { fromCount: "asc" } } }, orderBy: { name: "asc" } }),
    prisma.payrollAccrual.groupBy({ by: ["userId"], where: { status: "ACCRUED" }, _sum: { amount: true, quantity: true } }),
    prisma.payrollPayout.groupBy({ by: ["userId"], _sum: { amount: true } }),
    isOwner
      ? prisma.permission.findMany({ where: { code: { in: [...EMPLOYEE_ASSIGNABLE] } }, orderBy: [{ module: "asc" }, { code: "asc" }] })
      : Promise.resolve([]),
  ]);
  const accMap = new Map(accruals.map((a) => [a.userId, a]));
  const payMap = new Map(payouts.map((p) => [p.userId, p]));
  const permModules = [...new Set(assignablePerms.map((p) => p.module))];

  async function schemeAction(formData: FormData) { "use server"; await updatePayScheme(formData); }

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <div className={styles.headerText}>
          <h1 className={styles.title}>{t("page.employees")}</h1>
          <p className={styles.subtitle}>{t("emp.hint")}</p>
        </div>
      </header>

      {isOwner ? (
        <AddEmployeeForm
          locale={locale}
          permissions={assignablePerms.map((p) => ({ id: p.id, code: p.code as PermissionCode, module: p.module }))}
          modules={permModules}
        />
      ) : null}

      <section className={styles.section} data-tour="emp-list">
        <div className={styles.sectionHead}>
          <h2 className={styles.sectionTitle}>{t("page.employees")}</h2>
        </div>
        <div className={styles.tableWrap}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>{t("emp.employee")}</th>
                <th>{t("emp.position")}</th>
                <th>{t("emp.scheme")}</th>
                <th className={styles.thRight}>{t("emp.accrued")}</th>
                <th className={styles.thRight}>{t("emp.paidOut")}</th>
                <th className={styles.thRight}>{t("common.debt")}</th>
              </tr>
            </thead>
            <tbody>
              {users.map((u) => {
                const acc = D(String(accMap.get(u.id)?._sum.amount ?? 0));
                const paid = D(String(payMap.get(u.id)?._sum.amount ?? 0));
                const schemeLabel = u.payScheme
                  ? u.payScheme.kind === "SALES_COMMISSION" ? t("emp.commissionTitle")
                    : u.payScheme.productionRate != null ? t("emp.output")
                    : u.payScheme.name
                  : "—";
                return (
                  <tr key={u.id}>
                    <td data-label={t("emp.employee")}>
                      <Link href={`/employees/${u.id}`} className={styles.tdLink}>{u.name}</Link>
                      <p className={styles.tdMuted}>{u.phone ? formatPhoneDisplay(u.phone) : u.email}</p>
                    </td>
                    <td data-label={t("emp.position")}>{n("role", u.role.code, u.role.name)}</td>
                    <td data-label={t("emp.scheme")} className={styles.tdMuted}>{schemeLabel}</td>
                    <td className={styles.tdRight} data-label={t("emp.accrued")}>{moneyDisplay(acc)} с</td>
                    <td className={styles.tdRight} data-label={t("emp.paidOut")}>{moneyDisplay(paid)} с</td>
                    <td className={styles.tdRight} data-label={t("common.debt")}>{moneyDisplay(acc.sub(paid))} с</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <ul className={styles.mobileList}>
          {users.map((u) => {
            const acc = D(String(accMap.get(u.id)?._sum.amount ?? 0));
            const paid = D(String(payMap.get(u.id)?._sum.amount ?? 0));
            return (
              <li key={u.id}>
                <Link href={`/employees/${u.id}`} className={styles.mobileCard}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <span className={styles.mobileName}>{u.name}</span>
                    <ChevronRight size={16} strokeWidth={ICON_STROKE} style={{ color: "var(--ink-3)" }} />
                  </div>
                  <p className={styles.mobileMeta}>{n("role", u.role.code, u.role.name)} · {u.phone ? formatPhoneDisplay(u.phone) : u.email}</p>
                  <div className={styles.mobileRow}>
                    <span><span className={styles.mobileRowLabel}>{t("emp.accrued")}: </span><span className={styles.mobileRowValue}>{moneyDisplay(acc)} с</span></span>
                    <span><span className={styles.mobileRowLabel}>{t("common.debt")}: </span><span className={styles.mobileRowValue}>{moneyDisplay(acc.sub(paid))} с</span></span>
                  </div>
                </Link>
              </li>
            );
          })}
        </ul>
      </section>

      {schemes
        .filter((scheme) => scheme.productionRate == null)
        .map((scheme) => {
        const isCommission = scheme.kind === "SALES_COMMISSION" || scheme.kind === "MIXED";
        const title = scheme.kind === "SALES_COMMISSION" ? t("emp.commissionTitle") : scheme.name;
        const hint = isCommission ? t("emp.commissionHint") : "";
        return (
          <CommissionSchemeSection key={scheme.id} title={title}>
            {hint ? <p style={{ marginBottom: 12, fontSize: 13, color: "var(--ink-2)" }}>{hint}</p> : null}
            {canEditScheme ? (
              <form action={schemeAction} className="grid gap-3">
                <input type="hidden" name="id" value={scheme.id} />
                {isCommission ? (
                  <>
                    <FormField label={t("emp.model")} className="max-w-xl">
                        <AppSelect
                          name="commissionMode"
                          defaultValue={scheme.commissionMode ?? "PROGRESSIVE"}
                          options={[
                            { value: "PROGRESSIVE", label: t("emp.progressive") },
                            { value: "TIERED", label: t("emp.tiered") },
                          ]}
                        />
                      </FormField>
                      <input type="hidden" name="commissionBase" value={scheme.commissionBase ?? "PAID"} />
                      <p style={{ fontSize: 13, color: "var(--ink-2)" }}>{t("emp.basePaid")}</p>
                      <div className="overflow-x-auto">
                        <div className="mb-1 grid min-w-[20rem] grid-cols-3 gap-2 text-xs font-semibold" style={{ color: "var(--ink-3)" }}>
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
                    {isCommission ? t("emp.saveCommission") : t("emp.saveScheme")}
                  </button>
                </form>
              ) : (
                <ul style={{ fontSize: 13, color: "var(--ink-2)", margin: 0, padding: 0, listStyle: "none" }}>
                  {scheme.tiers.map((tier) => (
                    <li key={tier.id}>{tier.fromCount}–{tier.toCount ?? "∞"} · {qtyDisplay(tier.percent)}%</li>
                  ))}
                </ul>
              )}
          </CommissionSchemeSection>
        );
      })}
    </div>
  );
}
