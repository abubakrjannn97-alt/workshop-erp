import { getTranslator } from "@core/shared/i18n/locale";
import { HeaderBackButton } from "@/components/header-back-button";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { prisma } from "@core/infrastructure/prisma";
import { requirePermission } from "@core/auth/authz";
import { hasPermission } from "@core/auth/authz";
import { archiveCustomer, updateCustomer } from "@/app/actions/customers";
import { D, moneyDisplay } from "@core/shared/decimal";
import { formatPhone } from "@core/shared/format";
import { FormField } from "@/components/form-field";
import { PendingButton } from "@/components/pending-button";
import { StatusBadge, orderTone, payTone } from "@/components/status-badge";
import { ChevronRight, Plus } from "lucide-react";
import { ICON_STROKE } from "@/components/nav-icons";
import { EmptyState } from "@/components/empty-state";
import { ClipboardList } from "lucide-react";
import styles from "../../customers.module.css";

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
    <div className={styles.page}>
      {/* ─── Header ─── */}
      <header className={styles.header}>
        <div className={styles.headerLead}>
          <HeaderBackButton locale={locale} href="/crm" />
          <div className={styles.headerText}>
          <h1 className={styles.title}>{customer.name}</h1>
          {customer.phone ? (
            <p className={styles.subtitle}>{t("common.tel")} {formatPhone(customer.phone)}</p>
          ) : null}
        </div>
        </div>
        <div className={styles.headerActions}>
          <Link href={`/crm/history?customerId=${customer.id}`} className={styles.ghostLink}>
            {t("crm.purchaseHistory")}
          </Link>
          {canCreateOrder ? (
            <Link href={`/orders/new?customerId=${customer.id}`} className={styles.primaryBtn}>
              <span className={styles.primaryBtnIcon} aria-hidden>
                <Plus size={16} strokeWidth={ICON_STROKE} />
              </span>
              {t("sales.newOrder")}
            </Link>
          ) : null}
          {canCreateOrder ? (
            <Link href={`/orders/new?customerId=${customer.id}`} className={styles.iconBtn} aria-label={t("sales.newOrder")}>
              <Plus size={20} strokeWidth={ICON_STROKE} />
            </Link>
          ) : null}
        </div>
      </header>

      {/* ─── KPI ─── */}
      <div className={styles.detailKpi}>
        <div className={styles.kpiBox}>
          <p className={styles.kpiLabel}>{t("crm.purchases")}</p>
          <p className={styles.kpiValue}>{moneyDisplay(turnover)} с</p>
        </div>
        <div className={styles.kpiBox}>
          <p className={styles.kpiLabel}>{t("common.debt")}</p>
          <p className={debt.gt(0) ? styles.kpiValueDanger : styles.kpiValue}>{moneyDisplay(debt)} с</p>
        </div>
        <div className={styles.kpiBox}>
          <p className={styles.kpiLabel}>{t("crm.avgCheck")}</p>
          <p className={styles.kpiValue}>{moneyDisplay(avg)} с</p>
        </div>
        <div className={styles.kpiBox}>
          <p className={styles.kpiLabel}>{t("crm.lastPurchase")}</p>
          <p className={styles.kpiValue}>{last ? last.createdAt.toLocaleDateString(loc) : "—"}</p>
        </div>
      </div>

      {/* ─── Edit form ─── */}
      {canManage && !customer.archivedAt ? (
        <section className={styles.section}>
          <div className={styles.sectionHead}>
            <h2 className={styles.sectionTitle}>{t("crm.editCustomer")}</h2>
          </div>
          <div className={styles.sectionBody}>
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
          </div>
        </section>
      ) : null}

      {/* ─── Orders ─── */}
      <section className={styles.section}>
        <div className={styles.sectionHead}>
          <h2 className={styles.sectionTitle}>{t("crm.orderHistory")}</h2>
        </div>
        {customer.orders.length === 0 ? (
          <div className={styles.sectionBody}>
            <EmptyState icon={ClipboardList} title={t("crm.noOrders")} description="" />
          </div>
        ) : (
          <>
            <div className={styles.tableHead} style={{ gridTemplateColumns: "minmax(0,1fr) 6rem 8rem 8rem 2rem" }}>
              <span>{t("list.col.when")}</span>
              <span className={styles.tableHeadRight}>{t("home.col.amount")}</span>
              <span>{t("home.col.status")}</span>
              <span className={styles.tableHeadRight}>{t("common.payment")}</span>
              <span aria-hidden />
            </div>
            <ul className={styles.tableBody}>
              {customer.orders.map((o) => (
                <li key={o.id}>
                  <Link
                    href={`/orders/${o.id}`}
                    className={styles.tableRow}
                    style={{ gridTemplateColumns: "minmax(0,1fr) 6rem 8rem 8rem 2rem" }}
                  >
                    <span className={styles.customerName}>{o.createdAt.toLocaleDateString(loc)}</span>
                    <span className={styles.cellMoney}>{moneyDisplay(o.total)} с</span>
                    <span>
                      <StatusBadge label={n("ostatus", o.status.code, o.status.name)} tone={orderTone(o.status.code)} />
                    </span>
                    <span style={{ textAlign: "right" }}>
                      <StatusBadge label={t(`pay.${o.paymentStatus}`)} tone={payTone(o.paymentStatus)} />
                    </span>
                    <span className={styles.chevron} aria-hidden>
                      <ChevronRight size={16} strokeWidth={ICON_STROKE} />
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
            <ul className={styles.mobileList}>
              {customer.orders.map((o) => (
                <li key={o.id}>
                  <Link href={`/orders/${o.id}`} className={styles.mobileCard}>
                    <div className={styles.mobileTop}>
                      <span className={styles.mobileName}>{o.createdAt.toLocaleDateString(loc)}</span>
                      <span className={styles.cellMoney}>{moneyDisplay(o.total)} с</span>
                    </div>
                    <div className={styles.mobileBottom}>
                      <StatusBadge label={n("ostatus", o.status.code, o.status.name)} tone={orderTone(o.status.code)} />
                      <StatusBadge label={t(`pay.${o.paymentStatus}`)} tone={payTone(o.paymentStatus)} />
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          </>
        )}
      </section>
    </div>
  );
}
