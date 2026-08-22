import Link from "next/link";
import { prisma } from "@core/infrastructure/prisma";
import { requirePermission } from "@core/auth/authz";
import { D, moneyDisplay } from "@core/shared/decimal";
import { fetchFinanceDashboardData } from "@core/finance/finance-summary";
import { getTranslator } from "@core/shared/i18n/locale";
import { PageHeader } from "@/components/page-header";
import styles from "../finance.module.css";

export default async function FinanceDebtsPage() {
  const { t } = await getTranslator();
  await requirePermission("finance.view");

  const [data, orders] = await Promise.all([
    fetchFinanceDashboardData(),
    prisma.order.findMany({
      where: { status: { code: { not: "CANCELLED" } } },
      include: { customer: true, status: true },
      orderBy: { createdAt: "desc" },
    }),
  ]);

  const customerDebts = orders
    .map((o) => ({
      id: o.id,
      name: o.customer.name,
      number: o.number,
      debt: D(String(o.total)).sub(String(o.paidAmount)),
    }))
    .filter((o) => o.debt.gt(0))
    .sort((a, b) => (b.debt.gt(a.debt) ? 1 : -1));

  const supplierDebts = data.purchaseDebts
    .map((o) => ({
      id: o.id,
      name: o.supplier.name,
      number: o.number,
      debt: D(String(o.total)).sub(o.paidAmount),
    }))
    .filter((o) => o.debt.gt(0))
    .sort((a, b) => (b.debt.gt(a.debt) ? 1 : -1));

  const customerTotal = customerDebts.reduce((s, o) => s.add(o.debt), D(0));
  const supplierTotal = supplierDebts.reduce((s, o) => s.add(o.debt), D(0));

  return (
    <div className={styles.page}>
      <PageHeader title={t("home.debtsShort")} backHref="/" backLabel={t("common.back")} />

      <div className={styles.debtsPageGrid}>
        <section className={styles.section}>
          <div className={styles.sectionHead}>
            <div className={styles.debtHeadText}>
              <h2 className={styles.sectionTitle}>{t("home.debts")}</h2>
              <p className={styles.debtHeadHint}>{t("sales.unpaidHint")}</p>
            </div>
            <span className={styles.debtSummaryBadge}>{moneyDisplay(customerTotal)} с</span>
          </div>
          <div className={styles.sectionBody}>
            {customerDebts.length === 0 ? (
              <p className={styles.emptyInline}>{t("common.empty")}</p>
            ) : (
              <ul className={styles.balanceList}>
                {customerDebts.map((row) => (
                  <li key={row.id} className={styles.balanceRow}>
                    <div className={styles.debtRowMain}>
                      <Link href={`/orders/${row.id}`} className={styles.debtLinkName}>
                        {row.name}
                      </Link>
                      <span className={styles.tdMuted}>#{row.number}</span>
                    </div>
                    <span className={styles.balanceValueBad}>{moneyDisplay(row.debt)} с</span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </section>

        <section className={styles.section}>
          <div className={styles.sectionHead}>
            <div className={styles.debtHeadText}>
              <h2 className={styles.sectionTitle}>{t("home.weOwe")}</h2>
              <p className={styles.debtHeadHint}>{t("fin.weOweHint")}</p>
            </div>
            <span className={styles.debtSummaryBadge}>{moneyDisplay(supplierTotal)} с</span>
          </div>
          <div className={styles.sectionBody}>
            {supplierDebts.length === 0 ? (
              <p className={styles.emptyInline}>{t("common.empty")}</p>
            ) : (
              <ul className={styles.balanceList}>
                {supplierDebts.map((row) => (
                  <li key={row.id} className={styles.balanceRow}>
                    <div className={styles.debtRowMain}>
                      <span className={styles.balanceName}>{row.name}</span>
                      <span className={styles.tdMuted}>{t("fin.purchaseRef", { number: row.number })}</span>
                    </div>
                    <span className={styles.balanceValueBad}>{moneyDisplay(row.debt)} с</span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}
