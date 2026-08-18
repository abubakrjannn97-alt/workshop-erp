import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@core/infrastructure/prisma";
import { requirePermission } from "@core/auth/authz";
import { hasPermission } from "@core/auth/authz";
import { D, moneyDisplay, qtyDisplay } from "@core/shared/decimal";
import { assignPayScheme, payEmployee } from "@/app/actions/payroll";
import { periodKey, periodRange } from "@core/payroll/payroll";
import { getTranslator } from "@core/shared/i18n/locale";
import { intlLocale } from "@core/shared/i18n/i18n";
import { KpiCard } from "@/components/kpi-card";
import { PageHeader } from "@/components/page-header";
import { EmployeeAccessForm } from "@/components/employee-access-form";
import { EMPLOYEE_ASSIGNABLE, type PermissionCode } from "@core/rbac/permissions";
import { formatPhoneDisplay } from "@core/shared/phone";
import { archiveEmployee } from "@/app/actions/employees";
import { getDomainConfig } from "@core/config/domain-config";
import { DashKpiGrid } from "@/components/dashboard/dashboard-system";
import { DashPanel } from "@/components/dash-panel";
import { FormField } from "@/components/form-field";
import {
  DataList,
  DataListCell,
  DataListEmpty,
  DataListHead,
  DataListHeadCell,
  DataListMetric,
  DataListPrimary,
  DataListRow,
  dataListStyles,
} from "@/components/data-table";
import { StatusBadge } from "@/components/status-badge";

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
  if (!user || user.archivedAt) notFound();

  const canEdit = hasPermission(session.user.permissions, session.user.roleCode, "users.edit");
  const canPay = hasPermission(session.user.permissions, session.user.roleCode, "salary.approve");
  const key = periodKey();
  const { start, end } = periodRange(key);

  const [schemes, accounts, accruals, payouts, m2, accruedAgg, paidAgg, assignablePerms, domainConfig] =
    await Promise.all([
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
      isOwner && user.role.code === "employee"
        ? prisma.permission.findMany({
            where: { code: { in: [...EMPLOYEE_ASSIGNABLE] } },
            orderBy: [{ module: "asc" }, { code: "asc" }],
          })
        : Promise.resolve([]),
      getDomainConfig(),
    ]);
  const outputUnit = await prisma.unit.findUnique({
    where: { code: domainConfig.product.defaultOutputUnit },
  });
  const outputUnitSymbol = outputUnit?.symbol ?? t("common.unitGeneric");
  const permModules = [...new Set(assignablePerms.map((p) => p.module))];
  const selectedPermCodes = user.permissions.map((up) => up.permission.code as PermissionCode);

  async function archiveAction(formData: FormData) {
    "use server";
    await archiveEmployee(formData);
  }

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

  const metaLine = [
    n("role", user.role.code, user.role.name),
    user.phone ? formatPhoneDisplay(user.phone) : user.email,
    user.hiredAt ? `${t("common.from")} ${user.hiredAt.toLocaleDateString(intlLocale(locale))}` : null,
  ]
    .filter(Boolean)
    .join(" · ");

  function accrualKindLabel(kind: string) {
    if (kind === "PRODUCTION") return t("emp.output");
    if (kind === "COMMISSION") return t("emp.commission");
    return kind;
  }

  return (
    <div className="page-stack">
      <PageHeader title={user.name} description={metaLine} />

      {isOwner && user.role.code === "employee" ? (
        <EmployeeAccessForm
          locale={locale}
          userId={user.id}
          permissions={assignablePerms.map((p) => ({
            id: p.id,
            code: p.code as PermissionCode,
            module: p.module,
          }))}
          modules={permModules}
          selectedCodes={selectedPermCodes}
        />
      ) : null}

      <DashKpiGrid cols="4">
        <KpiCard label={t("emp.monthSales")} value={`${moneyDisplay(monthTurnover)} с`} tone="in" />
        <KpiCard label={t("emp.clientPaid")} value={`${moneyDisplay(monthPaid)} с`} tone="in" />
        <KpiCard label={t("emp.goodOutput")} value={`${qtyDisplay(m2._sum.quantity ?? 0)} ${outputUnitSymbol}`} tone="ink" />
        <KpiCard label={t("common.debt")} value={`${moneyDisplay(debt)} с`} tone="out" />
      </DashKpiGrid>

      {canEdit ? (
        <DashPanel title={t("emp.payScheme")}>
          <form action={assign} className="grid max-w-xl gap-3">
            <input type="hidden" name="userId" value={user.id} />
            <FormField label={t("emp.payScheme")}>
              <select name="paySchemeId" defaultValue={user.paySchemeId ?? ""} className="ui-input">
                <option value="">{t("emp.noScheme")}</option>
                {schemes.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.kind === "SALES_COMMISSION"
                      ? t("emp.commissionTitle")
                      : s.productionRate != null
                        ? t("emp.laborTitle")
                        : s.name}
                  </option>
                ))}
              </select>
            </FormField>
            <FormField label={t("emp.hiredAt")}>
              <input
                name="hiredAt"
                type="date"
                defaultValue={user.hiredAt ? user.hiredAt.toISOString().slice(0, 10) : ""}
                className="ui-input"
              />
            </FormField>
            <button type="submit" className="ui-btn-primary min-h-[44px]">
              {t("common.save")}
            </button>
          </form>
        </DashPanel>
      ) : null}

      {canPay && debt.gt(0) ? (
        <DashPanel title={t("emp.payout")}>
          <form action={payout} className="grid max-w-xl gap-3">
            <input type="hidden" name="userId" value={user.id} />
            <FormField label={`${t("common.amount")}, с`}>
              <input name="amount" defaultValue={moneyDisplay(debt)} className="ui-input" inputMode="decimal" />
            </FormField>
            <FormField label={t("fin.accounts")}>
              <select name="accountId" className="ui-input">
                {accounts.map((a) => (
                  <option key={a.id} value={a.id}>
                    {n("cash", a.code, a.name)}
                  </option>
                ))}
              </select>
            </FormField>
            <FormField label={t("common.comment")}>
              <input name="comment" placeholder={t("common.comment")} className="ui-input" />
            </FormField>
            <button type="submit" className="ui-btn-primary min-h-[44px]">
              {t("emp.payOutBtn")}
            </button>
          </form>
        </DashPanel>
      ) : null}

      <DashPanel title={t("emp.accruals")}>
        {accruals.length === 0 ? (
          <DataListEmpty>{t("emp.noneYet")}</DataListEmpty>
        ) : (
          <DataList layout="cols3">
            <DataListHead layout="cols3">
              <DataListHeadCell>{t("list.col.what")}</DataListHeadCell>
              <DataListHeadCell>{t("common.status")}</DataListHeadCell>
              <DataListHeadCell align="right">{t("list.col.sum")}</DataListHeadCell>
            </DataListHead>
            <ul className={dataListStyles.rows}>
              {accruals.map((a) => (
                <DataListRow key={a.id} layout="cols3">
                  <DataListPrimary
                    title={accrualKindLabel(a.kind)}
                    subtitle={[a.comment, a.periodKey].filter(Boolean).join(" · ") || undefined}
                  />
                  <DataListCell label={t("common.status")}>
                    {a.status === "REVERSED" ? (
                      <StatusBadge label={t("common.reversal")} tone="warn" />
                    ) : (
                      <StatusBadge label={a.status} tone="neutral" />
                    )}
                  </DataListCell>
                  <DataListMetric label={t("list.col.sum")} value={`${moneyDisplay(a.amount)} с`} />
                </DataListRow>
              ))}
            </ul>
          </DataList>
        )}
      </DashPanel>

      <p className="flex flex-wrap items-center gap-3 text-sm">
        <Link href="/employees" className="text-[var(--titan-dark)] hover:underline">
          {t("emp.allEmployees")}
        </Link>
        {isOwner && user.role.code === "employee" ? (
          <form action={archiveAction}>
            <input type="hidden" name="id" value={user.id} />
            <button type="submit" className="min-h-[44px] text-sm text-[var(--danger)]">
              {t("emp.archiveEmployee")}
            </button>
          </form>
        ) : null}
      </p>
    </div>
  );
}
