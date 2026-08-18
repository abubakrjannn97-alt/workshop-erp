import { PageHeader } from "@/components/page-header";
import { getTranslator } from "@core/shared/i18n/locale";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { prisma } from "@core/infrastructure/prisma";
import { requirePermission } from "@core/auth/authz";
import { hasPermission } from "@core/auth/authz";
import { archiveCustomer, updateCustomer } from "@/app/actions/customers";
import { D, moneyDisplay } from "@core/shared/decimal";
import { formatPhone } from "@core/shared/format";
import { FormField } from "@/components/form-field";
import { DashPanel } from "@/components/dash-panel";
import { DashKpiGrid } from "@/components/dashboard/dashboard-system";
import { KpiCard } from "@/components/kpi-card";
import { PendingButton } from "@/components/pending-button";
import {
  DataList,
  DataListEmpty,
  DataListHead,
  DataListHeadCell,
  DataListMetric,
  DataListPrimary,
  DataListRow,
  DataListCell,
  DataTableSection,
  dataListStyles,
} from "@/components/data-table";
import { StatusBadge, orderTone, payTone } from "@/components/status-badge";
import { ClipboardList } from "lucide-react";

export default async function CustomerPage({ params }: { params: Promise<{ id: string }> }) {
  const { t, n, locale } = await getTranslator();
  const session = await requirePermission("crm.view");
  const { id } = await params;
  const customer = await prisma.customer.findUnique({
    where: { id },
    include: {
      manager: true,
      orders: { include: { status: true }, orderBy: { createdAt: "desc" } },
    },
  });
  if (!customer) notFound();
  if (session.user.roleCode === "sales_manager" && customer.managerId !== session.user.id) {
    redirect("/crm");
  }

  const canManage = hasPermission(session.user.permissions, session.user.roleCode, "crm.manage");
  const canCreateOrder = hasPermission(session.user.permissions, session.user.roleCode, "orders.create");
  const turnover = customer.orders.reduce((s, o) => s.add(String(o.total)), D(0));
  const debt = customer.orders.reduce((s, o) => s.add(D(String(o.total)).sub(String(o.paidAmount))), D(0));
  const avg = customer.orders.length ? turnover.div(customer.orders.length) : D(0);
  const last = customer.orders[0];
  const loc = locale;

  async function save(formData: FormData) {
    "use server";
    await updateCustomer(formData);
  }
  async function archive(formData: FormData) {
    "use server";
    await archiveCustomer(formData);
    redirect("/crm");
  }

  return (
    <div className="page-stack">
      <PageHeader
        title={customer.name}
        description={customer.phone ? `${t("common.tel")} ${formatPhone(customer.phone)}` : undefined}
        actions={
          <div className="flex flex-wrap gap-2">
            <Link href={`/crm/history?customerId=${customer.id}`} className="ui-btn-secondary">
              {t("crm.purchaseHistory")}
            </Link>
            {canCreateOrder ? (
              <Link href={`/orders/new?customerId=${customer.id}`} className="ui-btn-primary inline-flex min-h-[44px] items-center">
                {t("sales.newOrder")}
              </Link>
            ) : null}
          </div>
        }
      />

      <DashKpiGrid cols="4">
        <KpiCard label={t("crm.purchases")} value={`${moneyDisplay(turnover)} с`} tone="in" />
        <KpiCard label={t("common.debt")} value={`${moneyDisplay(debt)} с`} tone="out" />
        <KpiCard label={t("crm.avgCheck")} value={`${moneyDisplay(avg)} с`} tone="ink" />
        <KpiCard label={t("crm.lastPurchase")} value={last ? last.createdAt.toLocaleDateString(loc) : "—"} tone="ink" />
      </DashKpiGrid>

      {canManage && !customer.archivedAt ? (
        <DashPanel title={t("crm.editCustomer")}>
          <form action={save} className="grid max-w-xl gap-3 sm:grid-cols-2">
            <input type="hidden" name="id" value={customer.id} />
            <FormField label={t("crm.fioCompany")} className="sm:col-span-2">
              <input name="name" defaultValue={customer.name} className="ui-input" required />
            </FormField>
            <FormField label={t("common.phone")}>
              <input name="phone" defaultValue={customer.phone ?? ""} className="ui-input" />
            </FormField>
            <FormField label={t("common.whatsapp")}>
              <input name="whatsapp" defaultValue={customer.whatsapp ?? ""} className="ui-input" />
            </FormField>
            <FormField label={t("common.address")} className="sm:col-span-2">
              <input name="address" defaultValue={customer.address ?? ""} className="ui-input" />
            </FormField>
            <FormField label={t("common.source")}>
              <input name="source" defaultValue={customer.source ?? ""} className="ui-input" />
            </FormField>
            <FormField label={t("common.comment")} className="sm:col-span-2">
              <textarea name="comment" defaultValue={customer.comment ?? ""} className="ui-input min-h-[5rem]" />
            </FormField>
            <PendingButton className="ui-btn-primary min-h-[44px] sm:col-span-2" pendingLabel={t("common.sending")}>
              {t("common.save")}
            </PendingButton>
          </form>
          <form action={archive} className="mt-3">
            <input type="hidden" name="id" value={customer.id} />
            <button type="submit" className="min-h-[44px] text-sm text-[var(--danger)] hover:underline">
              {t("crm.archiveCustomer")}
            </button>
          </form>
        </DashPanel>
      ) : null}

      <DashPanel title={t("crm.orderHistory")} icon={ClipboardList}>
        {customer.orders.length === 0 ? (
          <DataListEmpty>{t("crm.noOrders")}</DataListEmpty>
        ) : (
          <DataList layout="cols4">
            <DataListHead layout="cols4">
              <DataListHeadCell>{t("list.col.when")}</DataListHeadCell>
              <DataListHeadCell align="right">{t("home.col.amount")}</DataListHeadCell>
              <DataListHeadCell>{t("home.col.status")}</DataListHeadCell>
              <DataListHeadCell align="right">{t("common.payment")}</DataListHeadCell>
            </DataListHead>
            <ul className={dataListStyles.rows}>
              {customer.orders.map((o) => (
                <DataListRow key={o.id} layout="cols4">
                  <DataListPrimary
                    title={o.createdAt.toLocaleDateString(loc)}
                    href={`/orders/${o.id}`}
                  />
                  <DataListMetric label={t("home.col.amount")} value={`${moneyDisplay(o.total)} с`} />
                  <DataListCell label={t("home.col.status")}>
                    <StatusBadge label={n("ostatus", o.status.code, o.status.name)} tone={orderTone(o.status.code)} />
                  </DataListCell>
                  <DataListCell label={t("common.payment")} align="right">
                    <StatusBadge label={t(`pay.${o.paymentStatus}`)} tone={payTone(o.paymentStatus)} />
                  </DataListCell>
                </DataListRow>
              ))}
            </ul>
          </DataList>
        )}
      </DashPanel>
    </div>
  );
}
