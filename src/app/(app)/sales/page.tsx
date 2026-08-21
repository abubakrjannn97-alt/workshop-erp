import { getTranslator } from "@core/shared/i18n/locale";
import Link from "next/link";
import { ChevronRight, CircleDollarSign, Wallet } from "lucide-react";
import { prisma } from "@core/infrastructure/prisma";
import { requirePermission } from "@core/auth/authz";
import { D, moneyDisplay } from "@core/shared/decimal";
import { intlLocale } from "@core/shared/i18n/i18n";
import { ICON_STROKE } from "@/components/nav-icons";
import { RevealList } from "@/components/reveal-list";
import { StatusBadge, orderTone, payTone } from "@/components/status-badge";
import premium from "@/styles/premium.module.css";
import styles from "./sales.module.css";

export default async function SalesPage() {
  const { t, locale, n } = await getTranslator();
  const session = await requirePermission("orders.view");
  const own = session.user.roleCode === "sales_manager" ? { sellerId: session.user.id } : {};

  const monthStart = new Date();
  monthStart.setDate(1);
  monthStart.setHours(0, 0, 0, 0);
  const monthLabel = monthStart.toLocaleDateString(intlLocale(locale), { month: "long", year: "numeric" });

  const [unpaid, overdue, monthOrders, unpaidCount] = await Promise.all([
    prisma.order.findMany({
      where: {
        ...own,
        paymentStatus: { in: ["unpaid", "partial"] },
        status: { code: { not: "CANCELLED" } },
      },
      include: { customer: true },
      orderBy: { createdAt: "desc" },
      take: 40,
    }),
    prisma.order.findMany({
      where: {
        ...own,
        dueAt: { lt: new Date() },
        status: { code: { notIn: ["COMPLETED", "CANCELLED", "ISSUED"] } },
      },
      include: { customer: true, status: true },
      take: 20,
    }),
    prisma.order.findMany({
      where: { ...own, createdAt: { gte: monthStart }, status: { code: { not: "CANCELLED" } } },
      select: { total: true },
    }),
    prisma.order.count({
      where: {
        ...own,
        paymentStatus: { in: ["unpaid", "partial"] },
        status: { code: { not: "CANCELLED" } },
      },
    }),
  ]);

  const monthTotal = monthOrders.reduce((s, o) => s.add(String(o.total)), D(0));
  const monthCount = monthOrders.length;
  const monthOrdersHref = "/orders?period=month";

  return (
    <div className={`${premium.page} ${styles.page}`}>
      <header className={styles.header}>
        <div>
          <p className={styles.eyebrow}>{monthLabel}</p>
          <h1 className={styles.title}>{t("page.sales")}</h1>
          <p className={styles.subtitle}>{t("page.salesHint")}</p>
        </div>
      </header>

      <section className={styles.kpiBoard} aria-label={t("page.sales")}>
        <Link href={monthOrdersHref} className={`${styles.kpiCard} ${styles.kpiHero}`}>
          <div className={styles.kpiTop}>
            <span className={`${styles.kpiIcon} ${styles.kpiIconHero}`}>
              <CircleDollarSign size={22} strokeWidth={ICON_STROKE} aria-hidden />
            </span>
            <span className={styles.kpiSource}>{t("sales.kpiFromOrders")}</span>
          </div>
          <p className={styles.kpiLabel}>{t("sales.monthTotal")}</p>
          <p className={styles.kpiHeroValue}>{moneyDisplay(monthTotal)} с</p>
          <p className={styles.kpiHint}>
            {t("sales.monthSalesHint", { month: monthLabel, n: String(monthCount) })}
          </p>
        </Link>

        <a href="#debts" className={`${styles.kpiCard} ${styles.kpiWarn}`}>
          <div className={styles.kpiTop}>
            <span className={`${styles.kpiIcon} ${styles.kpiIconWarn}`}>
              <Wallet size={20} strokeWidth={ICON_STROKE} aria-hidden />
            </span>
            <span className={styles.kpiSource}>{t("sales.kpiFromDebts")}</span>
          </div>
          <p className={styles.kpiLabel}>{t("sales.unpaid")}</p>
          <p className={`${styles.kpiValue} ${styles.kpiValueWarn}`}>{String(unpaidCount)}</p>
          <p className={styles.kpiHint}>{t("sales.unpaidHint")}</p>
        </a>
      </section>

      <Link href={monthOrdersHref} className={styles.monthGate}>
        <div className={styles.monthGateText}>
          <span className={styles.monthGateTitle}>{t("sales.recentOrders")}</span>
          <span className={styles.monthGateHint}>
            {t("sales.openMonthOrdersHint", { month: monthLabel, n: String(monthCount) })}
          </span>
        </div>
        <span className={styles.monthGateArrow} aria-hidden>
          <ChevronRight size={22} strokeWidth={ICON_STROKE} />
        </span>
      </Link>

      {overdue.length > 0 ? (
        <section className={`${premium.section} ${premium.sectionWarn}`}>
          <div className={premium.sectionHead}>
            <h2 className={premium.sectionTitleWarn}>{t("sales.overdueOrders")}</h2>
          </div>
          <div className={premium.tableWrap}>
            <table className={premium.table}>
              <thead>
                <tr>
                  <th>{t("home.col.customer")}</th>
                  <th>{t("common.until")}</th>
                  <th>{t("home.col.status")}</th>
                </tr>
              </thead>
              <tbody>
                {overdue.map((o) => (
                  <tr key={o.id}>
                    <td>
                      <Link href={`/orders/${o.id}`} className={premium.rowLink}>
                        {o.customer.name}
                      </Link>
                    </td>
                    <td className={premium.tdBad}>{o.dueAt?.toLocaleDateString(intlLocale(locale))}</td>
                    <td>
                      <StatusBadge label={n("ostatus", o.status.code, o.status.name)} tone={orderTone(o.status.code)} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <ul className={premium.mobileList}>
            {overdue.map((o) => (
              <li key={o.id} className={premium.mobileCard}>
                <Link href={`/orders/${o.id}`} style={{ textDecoration: "none", color: "inherit" }}>
                  <span className={premium.mobileName}>{o.customer.name}</span>
                  <div style={{ display: "flex", justifyContent: "space-between", marginTop: 4, gap: 8 }}>
                    <span className={premium.tdBad}>{o.dueAt?.toLocaleDateString(intlLocale(locale))}</span>
                    <StatusBadge label={n("ostatus", o.status.code, o.status.name)} tone={orderTone(o.status.code)} />
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      <section className={premium.section} data-tour="sales-debts" id="debts">
        <div className={premium.sectionHead}>
          <h2 className={premium.sectionTitle}>{t("sales.clientDebts")}</h2>
        </div>
        {unpaid.length === 0 ? (
          <div className={premium.empty}>{t("sales.noDebts")}</div>
        ) : (
          <>
            <div className={premium.tableWrap}>
              <table className={premium.table}>
                <thead>
                  <tr>
                    <th>{t("home.col.customer")}</th>
                    <th className={premium.thRight}>{t("common.debt")}</th>
                    <th>{t("home.col.status")}</th>
                  </tr>
                </thead>
                <RevealList as="tbody" moreLabel={t("home.seeAll")} lessLabel={t("home.hide")} limit={8}>
                  {unpaid.map((o) => (
                    <tr key={o.id}>
                      <td>
                        <Link href={`/orders/${o.id}`} className={premium.tdLink}>
                          {o.customer.name}
                        </Link>
                      </td>
                      <td className={`${premium.tdRight} ${premium.tdBad}`}>
                        {moneyDisplay(D(String(o.total)).sub(o.paidAmount))} с
                      </td>
                      <td>
                        <StatusBadge label={t(`pay.${o.paymentStatus}`)} tone={payTone(o.paymentStatus)} />
                      </td>
                    </tr>
                  ))}
                </RevealList>
              </table>
            </div>
            <ul className={premium.mobileList}>
              {unpaid.map((o) => (
                <li key={o.id}>
                  <Link href={`/orders/${o.id}`} className={premium.mobileCard}>
                    <span className={premium.mobileName}>{o.customer.name}</span>
                    <p className={premium.mobileMeta}>
                      {moneyDisplay(D(String(o.total)).sub(o.paidAmount))} с ·{" "}
                      <StatusBadge label={t(`pay.${o.paymentStatus}`)} tone={payTone(o.paymentStatus)} />
                    </p>
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
