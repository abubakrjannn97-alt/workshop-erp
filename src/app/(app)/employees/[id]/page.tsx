import { HeaderBackButton } from "@/components/header-back-button";
import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@core/infrastructure/prisma";
import { requirePermission, hasPermission } from "@core/auth/authz";
import { D, moneyDisplay, qtyDisplay } from "@core/shared/decimal";
import { assignPayScheme, payEmployee } from "@/app/actions/payroll";
import { periodKey, periodRange } from "@core/payroll/payroll";
import { getTranslator } from "@core/shared/i18n/locale";
import { intlLocale } from "@core/shared/i18n/i18n";
import { EmployeeAccessForm } from "@/components/employee-access-form";
import { EMPLOYEE_ASSIGNABLE, type PermissionCode } from "@core/rbac/permissions";
import { formatPhoneDisplay } from "@core/shared/phone";
import { archiveEmployee } from "@/app/actions/employees";
import { getDomainConfig } from "@core/config/domain-config";
import { FormField } from "@/components/form-field";
import { AppSelect } from "@/components/app-select";
import { StatusBadge } from "@/components/status-badge";
import styles from "../employees.module.css";

export default async function EmployeePage({ params }: { params: Promise<{ id: string }> }) {
  const { t, locale, n } = await getTranslator();
  const session = await requirePermission("users.view");
  const isOwner = session.user.roleCode === "owner";
  const { id } = await params;
  const user = await prisma.user.findUnique({
    where: { id },
    include: {
      role: true,
      payScheme: { include: { tiers: { orderBy: { fromCount: "asc" } } } },
      soldOrders: { include: { status: true } },
      permissions: { include: { permission: true } },
    },
  });
  if (!user || user.archivedAt || user.role.code === "owner") notFound();

  const canEdit = hasPermission(session.user.permissions, session.user.roleCode, "users.edit");
  const canPay = hasPermission(session.user.permissions, session.user.roleCode, "salary.approve");
  const key = periodKey();
  const { start, end } = periodRange(key);

  const [schemes, accounts, accruals, payouts, m2, accruedAgg, paidAgg, assignablePerms, domainConfig] = await Promise.all([
    prisma.payScheme.findMany({ orderBy: { name: "asc" } }),
    prisma.cashAccount.findMany({ where: { archivedAt: null } }),
    prisma.payrollAccrual.findMany({ where: { userId: id }, orderBy: { createdAt: "desc" }, take: 40 }),
    prisma.payrollPayout.findMany({ where: { userId: id }, orderBy: { createdAt: "desc" }, take: 20 }),
    prisma.payrollAccrual.aggregate({ where: { userId: id, kind: "PRODUCTION", status: "ACCRUED" }, _sum: { quantity: true, amount: true } }),
    prisma.payrollAccrual.aggregate({ where: { userId: id, status: "ACCRUED" }, _sum: { amount: true } }),
    prisma.payrollPayout.aggregate({ where: { userId: id }, _sum: { amount: true } }),
    isOwner && user.role.code === "employee"
      ? prisma.permission.findMany({ where: { code: { in: [...EMPLOYEE_ASSIGNABLE] } }, orderBy: [{ module: "asc" }, { code: "asc" }] })
      : Promise.resolve([]),
    getDomainConfig(),
  ]);
  const outputUnit = await prisma.unit.findUnique({ where: { code: domainConfig.product.defaultSaleUnit } });
  const outputUnitSymbol = outputUnit?.symbol ?? "м²";
  const permModules = [...new Set(assignablePerms.map((p) => p.module))];
  const selectedPermCodes = user.permissions.map((up) => up.permission.code as PermissionCode);
  const workQty = D(String(m2._sum.quantity ?? 0));
  const workPay = D(String(m2._sum.amount ?? 0));

  async function archiveAction(formData: FormData) { "use server"; await archiveEmployee(formData); }

  const accrued = D(String(accruedAgg._sum.amount ?? 0));
  const paid = D(String(paidAgg._sum.amount ?? 0));
  const debt = accrued.sub(paid);
  const monthSales = user.soldOrders.filter((o) => o.createdAt >= start && o.createdAt < end && o.status.code !== "CANCELLED");
  const monthTurnover = monthSales.reduce((s, o) => s.add(String(o.total)), D(0));
  const monthPaid = monthSales.reduce((s, o) => s.add(String(o.paidAmount)), D(0));

  async function assign(formData: FormData) { "use server"; await assignPayScheme(formData); }
  async function payout(formData: FormData) { "use server"; await payEmployee(formData); }

  const metaLine = [
    n("role", user.role.code, user.role.name),
    user.phone ? formatPhoneDisplay(user.phone) : user.email,
    user.hiredAt ? `${t("common.from")} ${user.hiredAt.toLocaleDateString(intlLocale(locale))}` : null,
  ].filter(Boolean).join(" · ");

  function accrualKindLabel(kind: string) {
    if (kind === "PRODUCTION") return t("emp.output");
    if (kind === "COMMISSION") return t("emp.commission");
    return kind;
  }

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <div className={styles.headerLead}>
          <HeaderBackButton locale={locale} />
          <div className={styles.headerText}>
          <h1 className={styles.title}>{user.name}</h1>
          <p className={styles.subtitle}>{metaLine}</p>
        </div>
        </div>
        <div className={styles.headerActions}>
          <Link href="/employees" className={styles.ghostLink}>{t("emp.allEmployees")}</Link>
        </div>
      </header>

      {isOwner && user.role.code === "employee" ? (
        <EmployeeAccessForm
          locale={locale}
          userId={user.id}
          permissions={assignablePerms.map((p) => ({ id: p.id, code: p.code as PermissionCode, module: p.module }))}
          modules={permModules}
          selectedCodes={selectedPermCodes}
        />
      ) : null}

      <div className={styles.kpiStrip}>
        <div className={styles.kpiBox}>
          <p className={styles.kpiLabel}>{t("emp.monthSales")}</p>
          <p className={styles.kpiValue}>{moneyDisplay(monthTurnover)} с</p>
        </div>
        <div className={styles.kpiBox}>
          <p className={styles.kpiLabel}>{t("emp.clientPaid")}</p>
          <p className={styles.kpiValue}>{moneyDisplay(monthPaid)} с</p>
        </div>
        <div className={styles.kpiBox}>
          <p className={styles.kpiLabel}>{t("emp.goodOutput")}</p>
          <p className={styles.kpiValueAccent}>{qtyDisplay(workQty)} {outputUnitSymbol}</p>
        </div>
        <div className={styles.kpiBox}>
          <p className={styles.kpiLabel}>{t("emp.workPay")}</p>
          <p className={styles.kpiValue}>{moneyDisplay(workPay)} с</p>
        </div>
        <div className={styles.kpiBox}>
          <p className={styles.kpiLabel}>{t("common.debt")}</p>
          <p className={debt.gt(0) ? styles.kpiValueBad : styles.kpiValue}>{moneyDisplay(debt)} с</p>
        </div>
      </div>

      {canEdit ? (
        <section className={styles.section}>
          <div className={styles.sectionHead}>
            <h2 className={styles.sectionTitle}>{t("emp.payScheme")}</h2>
          </div>
          <div className={styles.sectionBody}>
            <form action={assign} className="grid max-w-xl gap-3">
              <input type="hidden" name="userId" value={user.id} />
              <FormField label={t("emp.payScheme")}>
                <AppSelect
                  name="paySchemeId"
                  defaultValue={user.paySchemeId ?? ""}
                  placeholder={t("emp.noScheme")}
                  options={[
                    { value: "", label: t("emp.noScheme") },
                    ...schemes
                      .filter((s) => s.productionRate == null)
                      .map((s) => ({
                      value: s.id,
                      label: s.kind === "SALES_COMMISSION" ? t("emp.commissionTitle") : s.name,
                    })),
                  ]}
                />
              </FormField>
              <FormField label={t("emp.hiredAt")}>
                <input name="hiredAt" type="date" defaultValue={user.hiredAt ? user.hiredAt.toISOString().slice(0, 10) : ""} className="ui-input" />
              </FormField>
              <button type="submit" className="ui-btn-primary min-h-[44px]">{t("common.save")}</button>
            </form>
          </div>
        </section>
      ) : null}

      {canPay && debt.gt(0) ? (
        <section className={styles.section}>
          <div className={styles.sectionHead}>
            <h2 className={styles.sectionTitle}>{t("emp.payout")}</h2>
          </div>
          <div className={styles.sectionBody}>
            <form action={payout} className="grid max-w-xl gap-3">
              <input type="hidden" name="userId" value={user.id} />
              <FormField label={`${t("common.amount")}, с`}>
                <input name="amount" defaultValue={moneyDisplay(debt)} className="ui-input" inputMode="decimal" />
              </FormField>
              <FormField label={t("fin.accounts")}>
                <AppSelect
                  name="accountId"
                  defaultValue={accounts[0]?.id ?? ""}
                  options={accounts.map((a) => ({ value: a.id, label: n("cash", a.code, a.name) }))}
                />
              </FormField>
              <FormField label={t("common.comment")}>
                <input name="comment" placeholder={t("common.comment")} className="ui-input" />
              </FormField>
              <button type="submit" className="ui-btn-primary min-h-[44px]">{t("emp.payOutBtn")}</button>
            </form>
          </div>
        </section>
      ) : null}

      <section className={styles.section}>
        <div className={styles.sectionHead}>
          <h2 className={styles.sectionTitle}>{t("emp.accruals")}</h2>
        </div>
        {accruals.length === 0 ? (
          <div className={styles.sectionBody}>
            <p style={{ fontSize: 14, color: "var(--ink-3)" }}>{t("emp.noneYet")}</p>
          </div>
        ) : (
          <>
            <div className={styles.tableWrap}>
              <table className={styles.table}>
                <thead>
                  <tr>
                    <th>{t("list.col.what")}</th>
                    <th>{t("common.status")}</th>
                    <th className={styles.thRight}>{t("list.col.sum")}</th>
                  </tr>
                </thead>
                <tbody>
                  {accruals.map((a) => (
                    <tr key={a.id}>
                      <td>
                        <span className={styles.tdBold}>{accrualKindLabel(a.kind)}</span>
                        {(a.comment || a.periodKey) ? <p className={styles.tdMuted}>{[a.comment, a.periodKey].filter(Boolean).join(" · ")}</p> : null}
                      </td>
                      <td>
                        {a.status === "REVERSED"
                          ? <StatusBadge label={t("common.reversal")} tone="warn" />
                          : <StatusBadge label={a.status} tone="neutral" />}
                      </td>
                      <td className={styles.tdRight}>{moneyDisplay(a.amount)} с</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <ul className={styles.mobileList}>
              {accruals.map((a) => (
                <li key={a.id} className={styles.mobileCard} style={{ textDecoration: "none" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <span className={styles.mobileName}>{accrualKindLabel(a.kind)}</span>
                    <span style={{ fontWeight: 600, fontVariantNumeric: "tabular-nums" }}>{moneyDisplay(a.amount)} с</span>
                  </div>
                  {(a.comment || a.periodKey) ? <p className={styles.mobileMeta}>{[a.comment, a.periodKey].filter(Boolean).join(" · ")}</p> : null}
                  <div style={{ marginTop: 6 }}>
                    {a.status === "REVERSED"
                      ? <StatusBadge label={t("common.reversal")} tone="warn" />
                      : <StatusBadge label={a.status} tone="neutral" />}
                  </div>
                </li>
              ))}
            </ul>
          </>
        )}
      </section>

      <div className={styles.footerActions}>
        <Link href="/employees" className={styles.ghostLink}>{t("emp.allEmployees")}</Link>
        {isOwner && user.role.code === "employee" ? (
          <form action={archiveAction}>
            <input type="hidden" name="id" value={user.id} />
            <button type="submit" className={styles.dangerBtn}>{t("emp.archiveEmployee")}</button>
          </form>
        ) : null}
      </div>
    </div>
  );
}
