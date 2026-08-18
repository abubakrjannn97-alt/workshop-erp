import { PageHeader } from "@/components/page-header";
import { getTranslator } from "@core/shared/i18n/locale";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@core/auth/authz";
import { hasPermission } from "@core/auth/authz";
import { archiveCustomer, updateCustomer } from "@/app/actions/customers";
import { D, moneyDisplay } from "@core/shared/decimal";
import { formatPhone } from "@core/shared/format";
import { KpiCard } from "@/components/kpi-card";
import { RevealList } from "@/components/reveal-list";
import { StatusBadge, orderTone, payTone } from "@/components/status-badge";

export default async function CustomerPage({ params }: { params: Promise<{ id: string }> }) {
  const { t, n } = await getTranslator();
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
  const turnover = customer.orders.reduce((s, o) => s.add(String(o.total)), D(0));
  const debt = customer.orders.reduce((s, o) => s.add(D(String(o.total)).sub(o.paidAmount)), D(0));
  const avg = customer.orders.length ? turnover.div(customer.orders.length) : D(0);
  const last = customer.orders[0];

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
      <div>
        <PageHeader
          title={customer.name}
          actions={
            <Link href={`/crm/history?customerId=${customer.id}`} className="ui-btn-secondary">
              {t("crm.purchaseHistory")}
            </Link>
          }
        />
        {customer.phone ? (
          <p className="mt-1 text-sm text-[var(--text-secondary)]">
            {t("common.tel")} {formatPhone(customer.phone)}
          </p>
        ) : null}
      </div>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard label={t("crm.purchases")} value={`${moneyDisplay(turnover)} с`} tone="in" />
        <KpiCard label={t("common.debt")} value={`${moneyDisplay(debt)} с`} tone="out" />
        <KpiCard label={t("crm.avgCheck")} value={`${moneyDisplay(avg)} с`} tone="ink" />
        <KpiCard label={t("crm.lastPurchase")} value={last ? last.createdAt.toLocaleDateString() : "—"} tone="ink" />
      </div>

      {canManage && !customer.archivedAt ? (
        <form action={save} className="max-w-xl space-y-2 ui-card p-4">
          <input type="hidden" name="id" value={customer.id} />
          <Field name="name" label={t("crm.fioCompany")} defaultValue={customer.name} />
          <Field name="phone" label={t("common.phone")} defaultValue={customer.phone ?? ""} />
          <Field name="whatsapp" label={t("common.whatsapp")} defaultValue={customer.whatsapp ?? ""} />
          <Field name="address" label={t("common.address")} defaultValue={customer.address ?? ""} />
          <Field name="source" label={t("common.source")} defaultValue={customer.source ?? ""} />
          <label className="block text-sm">
            <span className="font-medium">{t("common.comment")}</span>
            <textarea
              name="comment"
              defaultValue={customer.comment ?? ""}
              className="mt-1 w-full rounded-lg border border-[var(--border)] px-3 py-2 text-sm"
            />
          </label>
          <div className="flex gap-2">
            <button className="ui-btn-primary">{t("common.save")}</button>
          </div>
        </form>
      ) : null}

      {canManage && !customer.archivedAt ? (
        <form action={archive}>
          <input type="hidden" name="id" value={customer.id} />
          <button className="text-sm text-[var(--danger)] hover:underline">{t("crm.archiveCustomer")}</button>
        </form>
      ) : null}

      <section className="ui-card">
        <div className="border-b border-[var(--line)] px-5 py-3">
          <h2 className="text-sm font-semibold">{t("crm.orderHistory")}</h2>
        </div>
        {customer.orders.length === 0 ? (
          <p className="px-5 py-6 text-sm text-[var(--muted)]">{t("crm.noOrders")}</p>
        ) : (
          <RevealList moreLabel={t("home.seeAll")} lessLabel={t("home.hide")} className="divide-y divide-[var(--border)]">
            {customer.orders.map((o) => (
              <li key={o.id} className="flex items-center justify-between px-5 py-3 text-sm">
                <div className="flex items-center gap-2">
                  <Link href={`/orders/${o.id}`} className="font-medium hover:underline">
                    {o.createdAt.toLocaleDateString()}
                  </Link>
                  <StatusBadge label={n("ostatus", o.status.code, o.status.name)} tone={orderTone(o.status.code)} />
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-semibold tabular-nums">{moneyDisplay(o.total)} с</span>
                  <StatusBadge label={t(`pay.${o.paymentStatus}`)} tone={payTone(o.paymentStatus)} />
                </div>
              </li>
            ))}
          </RevealList>
        )}
      </section>
    </div>
  );
}


function Field({ name, label, defaultValue }: { name: string; label: string; defaultValue: string }) {
  return (
    <label className="block text-sm">
      <span className="font-medium">{label}</span>
      <input name={name} defaultValue={defaultValue} className="mt-1 w-full rounded-lg border border-[var(--border)] px-3 py-2 text-sm" />
    </label>
  );
}
