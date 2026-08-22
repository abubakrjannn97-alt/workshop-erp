import { HeaderBackButton } from "@/components/header-back-button";
import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@core/infrastructure/prisma";
import { requirePermission, hasPermission } from "@core/auth/authz";
import { D, moneyDisplay, qtyDisplay } from "@core/shared/decimal";
import { assignPayScheme } from "@/app/actions/payroll";
import { getTranslator } from "@core/shared/i18n/locale";
import { intlLocale } from "@core/shared/i18n/i18n";
import { EmployeeAccessForm } from "@/components/employee-access-form";
import { EmployeePayoutForm } from "@/components/employee-payout-form";
import { EmployeePayoutHistory } from "@/components/employee-payout-history";
import { RevealList } from "@/components/reveal-list";
import { EMPLOYEE_ASSIGNABLE, type PermissionCode } from "@core/rbac/permissions";
import { formatPhoneDisplay } from "@core/shared/phone";
import { archiveEmployee } from "@/app/actions/employees";
import { getDomainConfig } from "@core/config/domain-config";
import { employeePaySchemeOptions, listWorkshopPaySchemes } from "@core/payroll/employee-pay-schemes";
import { loadPaymentCards } from "@core/config/payment-cards";
import { FormField } from "@/components/form-field";
import { AppSelect } from "@/components/app-select";
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
      permissions: { include: { permission: true } },
    },
  });
  if (!user || user.archivedAt || user.role.code === "owner") notFound();

  const canEdit = hasPermission(session.user.permissions, session.user.roleCode, "users.edit");
  const canPay = hasPermission(session.user.permissions, session.user.roleCode, "salary.approve");

  const roleCode = session.user.roleCode ?? "employee";

  const [schemesRaw, accounts, accruals, payouts, assignablePerms, domainConfig, paymentCards] = await Promise.all([
    listWorkshopPaySchemes(session.user.id, roleCode),
    prisma.cashAccount.findMany({ where: { archivedAt: null } }),
    prisma.payrollAccrual.findMany({ where: { userId: id }, orderBy: { createdAt: "desc" }, take: 40 }),
    prisma.payrollPayout.findMany({ where: { userId: id }, orderBy: { createdAt: "desc" }, take: 50 }),
    isOwner && user.role.code === "employee"
      ? prisma.permission.findMany({ where: { code: { in: [...EMPLOYEE_ASSIGNABLE] } }, orderBy: [{ module: "asc" }, { code: "asc" }] })
      : Promise.resolve([]),
    getDomainConfig(),
    loadPaymentCards(),
  ]);
  const schemeOptions = employeePaySchemeOptions(schemesRaw, t("emp.commissionTitle"));

  const lastPayoutAt = payouts[0]?.createdAt ?? user.hiredAt ?? new Date(0);
  const [periodM2, periodEarnedAgg, accruedAgg, paidAgg] = await Promise.all([
    prisma.payrollAccrual.aggregate({
      where: { userId: id, kind: "PRODUCTION", status: { not: "REVERSED" }, createdAt: { gte: lastPayoutAt } },
      _sum: { quantity: true },
    }),
    prisma.payrollAccrual.aggregate({
      where: { userId: id, status: "ACCRUED", createdAt: { gte: lastPayoutAt } },
      _sum: { amount: true },
    }),
    prisma.payrollAccrual.aggregate({ where: { userId: id, status: "ACCRUED" }, _sum: { amount: true } }),
    prisma.payrollPayout.aggregate({ where: { userId: id }, _sum: { amount: true } }),
  ]);
  const outputUnit = await prisma.unit.findUnique({ where: { code: domainConfig.product.defaultSaleUnit } });
  const outputUnitSymbol = outputUnit?.symbol ?? "м²";
  const permModules = [...new Set(assignablePerms.map((p) => p.module))];
  const selectedPermCodes = user.permissions.map((up) => up.permission.code as PermissionCode);
  const workQty = D(String(periodM2._sum.quantity ?? 0));
  const periodEarned = D(String(periodEarnedAgg._sum.amount ?? 0));

  async function archiveAction(formData: FormData) { "use server"; await archiveEmployee(formData); }

  const accrued = D(String(accruedAgg._sum.amount ?? 0));
  const paid = D(String(paidAgg._sum.amount ?? 0));
  const debt = accrued.sub(paid);
  const accountMap = new Map(accounts.map((a) => [a.id, n("cash", a.code, a.name)]));

  async function assign(formData: FormData) { "use server"; await assignPayScheme(formData); }

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

  const payoutRows = payouts.map((p) => ({
    id: p.id,
    amount: String(p.amount),
    comment: p.comment,
    createdAt: p.createdAt.toISOString(),
    accountLabel: p.accountId ? accountMap.get(p.accountId) ?? "—" : "—",
  }));

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

      <div className={`${styles.kpiStrip} ${styles.kpiStripTwo}`}>
        <div className={styles.kpiBox}>
          <p className={styles.kpiLabel}>{t("emp.periodOutput")}</p>
          <p className={styles.kpiValueAccent}>{qtyDisplay(workQty)} {outputUnitSymbol}</p>
        </div>
        <div className={styles.kpiBox}>
          <p className={styles.kpiLabel}>{t("emp.periodEarned")}</p>
          <p className={styles.kpiValue}>{moneyDisplay(periodEarned)} с</p>
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
                    ...schemeOptions,
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

      <section className={styles.section}>
        <div className={styles.sectionHead}>
          <h2 className={styles.sectionTitle}>{t("emp.accruals")}</h2>
        </div>
        {accruals.length === 0 ? (
          <div className={styles.sectionBody}>
            <p style={{ fontSize: 14, color: "var(--ink-3)" }}>{t("emp.noneYet")}</p>
          </div>
        ) : (
          <RevealList moreLabel={t("po.showAll")} lessLabel={t("home.hide")} limit={5} showCount={false} className={styles.accrualList}>
            {accruals.map((a) => (
              <li key={a.id} className={styles.accrualRow}>
                <div className={styles.accrualRowTop}>
                  <span className={styles.accrualKind}>{accrualKindLabel(a.kind)}</span>
                  <span className={styles.accrualAmount}>{moneyDisplay(a.amount)} с</span>
                </div>
                {(a.comment || a.periodKey) ? (
                  <p className={styles.accrualMeta}>{[a.comment, a.periodKey].filter(Boolean).join(" · ")}</p>
                ) : null}
              </li>
            ))}
          </RevealList>
        )}
      </section>

      <section className={styles.section}>
        <div className={styles.sectionHead}>
          <h2 className={styles.sectionTitle}>{t("emp.payoutHistory")}</h2>
        </div>
        <EmployeePayoutHistory locale={locale} payouts={payoutRows} />
      </section>

      {canPay && debt.gt(0) ? (
        <section className={styles.section}>
          <div className={styles.sectionHead}>
            <h2 className={styles.sectionTitle}>{t("emp.payout")}</h2>
          </div>
          <div className={styles.sectionBody}>
            <EmployeePayoutForm
              locale={locale}
              userId={user.id}
              defaultAmount={moneyDisplay(debt)}
              paymentCards={paymentCards}
            />
          </div>
        </section>
      ) : null}

      {isOwner && user.role.code === "employee" ? (
        <EmployeeAccessForm
          locale={locale}
          userId={user.id}
          permissions={assignablePerms.map((p) => ({ id: p.id, code: p.code as PermissionCode, module: p.module }))}
          modules={permModules}
          selectedCodes={selectedPermCodes}
        />
      ) : null}

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
