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
import { loadPaymentCards } from "@core/config/payment-cards";
import { formatOrderPaymentSummary } from "@core/orders/payment-method-label";
import { isCustomerStatus } from "@core/crm/customer-status";
import { FormField } from "@/components/form-field";
import { PendingButton } from "@/components/pending-button";
import { CustomerStatusPicker } from "@/components/crm/customer-status-picker";
import { StatusBadge, orderTone, payTone } from "@/components/status-badge";
import { ChevronRight } from "lucide-react";
import { ICON_STROKE } from "@/components/nav-icons";
import { EmptyState } from "@/components/empty-state";
import { ClipboardList } from "lucide-react";
import styles from "../../customers.module.css";

export default async function CustomerPage({ params }: { params: Promise<{ id: string }> }) {
  const { t, n, locale } = await getTranslator();
  const session = await requirePermission("crm.view");
  const { id } = await params;
  const [customer, paymentCards] = await Promise.all([
    prisma.customer.findUnique({
      where: { id },
      include: {
        manager: true,
        orders: {
          include: {
            status: true,
            payments: { orderBy: { createdAt: "desc" } },
          },
          orderBy: { createdAt: "desc" },
        },
      },
    }),
    loadPaymentCards(),
  ]);
  if (!customer) notFound();
  if (session.user.roleCode === "sales_manager" && customer.managerId !== session.user.id) {
    redirect("/crm");
  }

  const canManage = hasPermission(session.user.permissions, session.user.roleCode, "crm.manage");
  const turnover = customer.orders.reduce((s, o) => s.add(String(o.total)), D(0));
  const debt = customer.orders.reduce((s, o) => s.add(D(String(o.total)).sub(String(o.paidAmount))), D(0));
  const loc = locale;
  const contactPhone = customer.phone || customer.whatsapp || "";
  const customerStatus = isCustomerStatus(customer.pipelineStatus) ? customer.pipelineStatus : "NEW";

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
      <header className={styles.header}>
        <div className={styles.headerLead}>
          <HeaderBackButton locale={locale} href="/crm" />
          <div className={styles.headerText}>
            <h1 className={styles.title}>{customer.name}</h1>
            {contactPhone ? (
              <p className={styles.subtitle}>{formatPhone(contactPhone)}</p>
            ) : null}
          </div>
        </div>
        <div className={styles.headerActions}>
          <Link href={`/crm/history?customerId=${customer.id}`} className={styles.ghostLink}>
            {t("crm.purchaseHistory")}
          </Link>
        </div>
      </header>

      {canManage && !customer.archivedAt ? (
        <section className={styles.section}>
          <div className={styles.sectionHead}>
            <h2 className={styles.sectionTitle}>{t("crm.clientStatus")}</h2>
          </div>
          <div className={styles.sectionBody}>
            <CustomerStatusPicker customerId={customer.id} status={customerStatus} locale={locale} />
          </div>
        </section>
      ) : null}

      <div className={styles.detailKpi}>
        <div className={styles.kpiBox}>
          <p className={styles.kpiLabel}>{t("crm.purchases")}</p>
          <p className={styles.kpiValue}>{moneyDisplay(turnover)} с</p>
          {customer.orders.length > 0 ? (
            <p className={styles.kpiHint}>{t("crm.ordersCount", { n: String(customer.orders.length) })}</p>
          ) : null}
        </div>
        <div className={styles.kpiBox}>
          <p className={styles.kpiLabel}>{t("common.debt")}</p>
          <p className={debt.gt(0) ? styles.kpiValueDanger : styles.kpiValue}>{moneyDisplay(debt)} с</p>
          {debt.gt(0) ? <p className={styles.kpiHintWarn}>{t("orders.attention")}</p> : null}
        </div>
      </div>

      {canManage && !customer.archivedAt ? (
        <section className={styles.section}>
          <div className={styles.sectionHead}>
            <h2 className={styles.sectionTitle}>{t("crm.editCustomer")}</h2>
          </div>
          <div className={styles.sectionBody}>
            <form action={save} className={styles.customerForm}>
              <input type="hidden" name="id" value={customer.id} />
              <FormField label={t("crm.fioCompany")} className={styles.fieldFull}>
                <input name="name" defaultValue={customer.name} className="ui-input" required />
              </FormField>
              <FormField label={t("crm.phoneWhatsapp")} className={styles.fieldFull}>
                <input
                  name="phone"
                  defaultValue={contactPhone}
                  className="ui-input"
                  inputMode="tel"
                  placeholder="+992 …"
                />
              </FormField>
              <PendingButton className="ui-btn-primary min-h-[44px] w-full" pendingLabel={t("common.sending")}>
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
            <div className={styles.tableHead} style={{ gridTemplateColumns: "minmax(0,1fr) 6rem 8rem 1fr 2rem" }}>
              <span>{t("list.col.when")}</span>
              <span className={styles.tableHeadRight}>{t("home.col.amount")}</span>
              <span>{t("home.col.status")}</span>
              <span>{t("orders.paymentMethod")}</span>
              <span aria-hidden />
            </div>
            <ul className={styles.tableBody}>
              {customer.orders.map((o) => {
                const paySummary = formatOrderPaymentSummary(
                  o.payments.map((p) => ({
                    amount: String(p.amount),
                    method: p.method,
                    comment: p.comment,
                    reversesId: p.reversesId,
                  })),
                  paymentCards,
                  t,
                );
                return (
                  <li key={o.id}>
                    <Link
                      href={`/orders/${o.id}`}
                      className={styles.tableRow}
                      style={{ gridTemplateColumns: "minmax(0,1fr) 6rem 8rem 1fr 2rem" }}
                    >
                      <span className={styles.customerName}>{o.createdAt.toLocaleDateString(loc)}</span>
                      <span className={styles.cellMoney}>{moneyDisplay(o.total)} с</span>
                      <span>
                        <StatusBadge label={n("ostatus", o.status.code, o.status.name)} tone={orderTone(o.status.code)} />
                      </span>
                      <span className={styles.cellText}>{paySummary}</span>
                      <span className={styles.chevron} aria-hidden>
                        <ChevronRight size={16} strokeWidth={ICON_STROKE} />
                      </span>
                    </Link>
                  </li>
                );
              })}
            </ul>
            <ul className={styles.mobileList}>
              {customer.orders.map((o) => {
                const paySummary = formatOrderPaymentSummary(
                  o.payments.map((p) => ({
                    amount: String(p.amount),
                    method: p.method,
                    comment: p.comment,
                    reversesId: p.reversesId,
                  })),
                  paymentCards,
                  t,
                );
                return (
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
                      <p className={styles.mobilePayMethod}>{paySummary}</p>
                    </Link>
                  </li>
                );
              })}
            </ul>
          </>
        )}
      </section>
    </div>
  );
}
