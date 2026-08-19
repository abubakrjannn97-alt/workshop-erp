import { getTranslator } from "@core/shared/i18n/locale";
import Link from "next/link";
import { prisma } from "@core/infrastructure/prisma";
import { requirePermission, hasPermission } from "@core/auth/authz";
import { D, moneyDisplay } from "@core/shared/decimal";
import { intlLocale } from "@core/shared/i18n/i18n";
import { RevealList } from "@/components/reveal-list";
import { StatusBadge, orderTone, payTone } from "@/components/status-badge";
import styles from "@/styles/premium.module.css";

export default async function SalesPage() {
  const { t, locale, n } = await getTranslator();
  const session = await requirePermission("orders.view");
  const canCreate = hasPermission(session.user.permissions, session.user.roleCode, "orders.create");
  const own = session.user.roleCode === "sales_manager" ? { sellerId: session.user.id } : {};
  const crmOwn = session.user.roleCode === "sales_manager" ? { managerId: session.user.id } : {};

  const [orders, unpaid, overdue, leads] = await Promise.all([
    prisma.order.findMany({ where: own, include: { customer: true, status: true }, orderBy: { createdAt: "desc" }, take: 20 }),
    prisma.order.findMany({ where: { ...own, paymentStatus: { in: ["unpaid", "partial"] }, status: { code: { not: "CANCELLED" } } }, include: { customer: true }, orderBy: { createdAt: "desc" }, take: 20 }),
    prisma.order.findMany({ where: { ...own, dueAt: { lt: new Date() }, status: { code: { notIn: ["COMPLETED", "CANCELLED", "ISSUED"] } } }, include: { customer: true, status: true }, take: 20 }),
    prisma.lead.count({ where: { archivedAt: null, ...crmOwn, stage: { isWon: false, isLost: false } } }),
  ]);
  const monthStart = new Date(); monthStart.setDate(1); monthStart.setHours(0, 0, 0, 0);
  const monthOrders = await prisma.order.findMany({ where: { ...own, createdAt: { gte: monthStart }, status: { code: { not: "CANCELLED" } } } });
  const monthTotal = monthOrders.reduce((s, o) => s.add(String(o.total)), D(0));

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <div className={styles.headerText}><h1 className={styles.title}>{t("page.sales")}</h1><p className={styles.subtitle}>{t("page.salesHint")}</p></div>
        {canCreate ? <div className={styles.headerActions}><Link href="/orders/new" className={styles.primaryBtn} data-tour="sales-new">{t("sales.newOrder")}</Link></div> : null}
      </header>

      <div className={styles.kpiStripThree}>
        <div className={styles.kpiBox}><p className={styles.kpiLabel}>{t("sales.monthTotal")}</p><p className={styles.kpiValue}>{moneyDisplay(monthTotal)} с</p></div>
        <div className={styles.kpiBox}><p className={styles.kpiLabel}>{t("sales.unpaid")}</p><p className={styles.kpiValueBad}>{String(unpaid.length)}</p></div>
        <div className={styles.kpiBox}><p className={styles.kpiLabel}>{t("sales.leadsOpen")}</p><p className={styles.kpiValue}>{String(leads)}</p></div>
      </div>

      {overdue.length > 0 ? (
        <section className={styles.section}>
          <div className={styles.sectionHead}><h2 className={styles.sectionTitleAccent}>{t("sales.overdueOrders")}</h2></div>
          <div className={styles.tableWrap}>
            <table className={styles.table}><thead><tr><th>{t("home.col.customer")}</th><th>{t("common.until")}</th><th>{t("home.col.status")}</th></tr></thead>
              <tbody>{overdue.map((o) => (<tr key={o.id}><td><Link href={`/orders/${o.id}`} className={styles.tdLink}>{o.customer.name}</Link></td><td className={styles.tdMuted}>{o.dueAt?.toLocaleDateString(intlLocale(locale))}</td><td><StatusBadge label={n("ostatus", o.status.code, o.status.name)} tone={orderTone(o.status.code)} /></td></tr>))}</tbody>
            </table>
          </div>
          <ul className={styles.mobileList}>{overdue.map((o) => (<li key={o.id} className={styles.mobileCard}><Link href={`/orders/${o.id}`} style={{ textDecoration: "none", color: "inherit" }}><span className={styles.mobileName}>{o.customer.name}</span><div style={{ display: "flex", justifyContent: "space-between", marginTop: 4 }}><span className={styles.mobileMeta}>{o.dueAt?.toLocaleDateString(intlLocale(locale))}</span><StatusBadge label={n("ostatus", o.status.code, o.status.name)} tone={orderTone(o.status.code)} /></div></Link></li>))}</ul>
        </section>
      ) : null}

      <section className={styles.section} data-tour="sales-debts">
        <div className={styles.sectionHead}><h2 className={styles.sectionTitle}>{t("sales.clientDebts")}</h2></div>
        {unpaid.length === 0 ? <div className={styles.empty}>{t("sales.noDebts")}</div> : (
          <>
            <div className={styles.tableWrap}>
              <table className={styles.table}><thead><tr><th>{t("home.col.customer")}</th><th className={styles.thRight}>{t("common.debt")}</th><th>{t("home.col.status")}</th></tr></thead>
                <tbody>
                  <RevealList as="tbody" moreLabel={t("home.seeAll")} lessLabel={t("home.hide")} limit={8}>
                    {unpaid.map((o) => (<tr key={o.id}><td><Link href={`/orders/${o.id}`} className={styles.tdLink}>{o.customer.name}</Link></td><td className={`${styles.tdRight} ${styles.tdBad}`}>{moneyDisplay(D(String(o.total)).sub(o.paidAmount))} с</td><td><StatusBadge label={t(`pay.${o.paymentStatus}`)} tone={payTone(o.paymentStatus)} /></td></tr>))}
                  </RevealList>
                </tbody>
              </table>
            </div>
            <ul className={styles.mobileList}>{unpaid.map((o) => (<li key={o.id}><Link href={`/orders/${o.id}`} className={styles.mobileCard}><span className={styles.mobileName}>{o.customer.name}</span><p className={styles.mobileMeta}>{moneyDisplay(D(String(o.total)).sub(o.paidAmount))} с · <StatusBadge label={t(`pay.${o.paymentStatus}`)} tone={payTone(o.paymentStatus)} /></p></Link></li>))}</ul>
          </>
        )}
      </section>

      <section className={styles.section}>
        <div className={styles.sectionHead}><h2 className={styles.sectionTitle}>{t("sales.recentOrders")}</h2></div>
        {orders.length === 0 ? <div className={styles.empty}>{t("crm.noOrders")}</div> : (
          <>
            <div className={styles.tableWrap}>
              <table className={styles.table}><thead><tr><th>{t("home.col.customer")}</th><th className={styles.thRight}>{t("home.col.amount")}</th><th>{t("home.col.status")}</th></tr></thead>
                <tbody>
                  <RevealList as="tbody" moreLabel={t("home.seeAll")} lessLabel={t("home.hide")} limit={8}>
                    {orders.map((o) => (<tr key={o.id}><td><Link href={`/orders/${o.id}`} className={styles.tdLink}>{o.customer.name}</Link></td><td className={styles.tdRight}>{moneyDisplay(o.total)} с</td><td><StatusBadge label={n("ostatus", o.status.code, o.status.name)} tone={orderTone(o.status.code)} /></td></tr>))}
                  </RevealList>
                </tbody>
              </table>
            </div>
            <ul className={styles.mobileList}>{orders.map((o) => (<li key={o.id}><Link href={`/orders/${o.id}`} className={styles.mobileCard}><span className={styles.mobileName}>{o.customer.name}</span><p className={styles.mobileMeta}>{moneyDisplay(o.total)} с · <StatusBadge label={n("ostatus", o.status.code, o.status.name)} tone={orderTone(o.status.code)} /></p></Link></li>))}</ul>
          </>
        )}
      </section>
    </div>
  );
}
