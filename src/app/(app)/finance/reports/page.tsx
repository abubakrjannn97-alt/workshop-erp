import { prisma } from "@core/infrastructure/prisma";
import { requirePermission } from "@core/auth/authz";
import { D, moneyDisplay } from "@core/shared/decimal";
import { getTranslator, intlLocale } from "@core/shared/i18n/locale";
import { RevealList } from "@/components/reveal-list";
import Link from "next/link";
import styles from "../finance.module.css";

export default async function FinanceReportsPage() {
  await requirePermission("finance.view");
  const { t, locale } = await getTranslator();

  const [obligations, purchases] = await Promise.all([
    prisma.obligation.findMany({ where: { status: "OPEN" }, orderBy: { dueAt: "asc" } }),
    prisma.purchaseOrder.findMany({ where: { status: { not: "CANCELLED" } }, include: { supplier: true } }),
  ]);

  const debts = purchases.filter((o) => D(String(o.total)).sub(o.paidAmount).gt(0));

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <div className={styles.headerText}>
          <h1 className={styles.title}>{t("nav.reports")}</h1>
          <p className={styles.subtitle}>{t("fin.reportsHint")}</p>
        </div>
        <div className={styles.headerActions}>
          <Link href="/finance" className={styles.ghostLink}>{t("page.finance")}</Link>
        </div>
      </header>

      <section className={styles.section}>
        <div className={styles.sectionHead}>
          <h2 className={styles.sectionTitleAccent}>{t("fin.supplierDebt")}</h2>
        </div>
        {debts.length === 0 ? (
          <div className={styles.empty}>{t("common.empty")}</div>
        ) : (
          <>
            <div className={styles.tableWrap}>
              <table className={styles.table}>
                <thead>
                  <tr>
                    <th>{t("common.supplier")}</th>
                    <th className={styles.thRight}>{t("common.debt")}</th>
                  </tr>
                </thead>
                <RevealList as="tbody" moreLabel={t("home.seeAll")} lessLabel={t("home.hide")} limit={8}>
                  {debts.map((o) => (
                    <tr key={o.id}>
                      <td>
                        <span className={styles.tdBold}>{o.supplier.name}</span>
                        <p className={styles.tdMuted}>{o.number}</p>
                      </td>
                      <td className={`${styles.tdRight} ${styles.tdBad}`}>{moneyDisplay(D(String(o.total)).sub(o.paidAmount))} с</td>
                    </tr>
                  ))}
                </RevealList>
              </table>
            </div>
            <ul className={styles.mobileList}>
              {debts.map((o) => (
                <li key={o.id} className={styles.mobileCard}>
                  <p className={styles.mobileName}>{o.supplier.name}</p>
                  <p className={styles.mobileMeta}>{o.number}</p>
                  <p className={styles.mobileValueBad}>{moneyDisplay(D(String(o.total)).sub(o.paidAmount))} с</p>
                </li>
              ))}
            </ul>
          </>
        )}
      </section>

      <section className={styles.section}>
        <div className={styles.sectionHead}>
          <h2 className={styles.sectionTitleAccent}>{t("fin.obligations")}</h2>
        </div>
        {obligations.length === 0 ? (
          <div className={styles.empty}>{t("common.empty")}</div>
        ) : (
          <>
            <div className={styles.tableWrap}>
              <table className={styles.table}>
                <thead>
                  <tr>
                    <th>{t("list.col.what")}</th>
                    <th className={styles.thRight}>{t("common.debt")}</th>
                  </tr>
                </thead>
                <RevealList as="tbody" moreLabel={t("home.seeAll")} lessLabel={t("home.hide")} limit={8}>
                  {obligations.map((o) => (
                    <tr key={o.id}>
                      <td>
                        <span className={styles.tdBold}>{o.name}</span>
                        {o.dueAt ? <p className={styles.tdMuted}>{o.dueAt.toLocaleDateString(intlLocale(locale))}</p> : null}
                      </td>
                      <td className={`${styles.tdRight} ${styles.tdBad}`}>{moneyDisplay(D(String(o.amount)).sub(o.paidAmount))} с</td>
                    </tr>
                  ))}
                </RevealList>
              </table>
            </div>
            <ul className={styles.mobileList}>
              {obligations.map((o) => (
                <li key={o.id} className={styles.mobileCard}>
                  <p className={styles.mobileName}>{o.name}</p>
                  {o.dueAt ? <p className={styles.mobileMeta}>{o.dueAt.toLocaleDateString(intlLocale(locale))}</p> : null}
                  <p className={styles.mobileValueBad}>{moneyDisplay(D(String(o.amount)).sub(o.paidAmount))} с</p>
                </li>
              ))}
            </ul>
          </>
        )}
      </section>
    </div>
  );
}
