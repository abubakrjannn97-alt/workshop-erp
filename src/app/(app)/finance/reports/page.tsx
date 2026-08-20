import { prisma } from "@core/infrastructure/prisma";
import { requirePermission } from "@core/auth/authz";
import { D } from "@core/shared/decimal";
import { getTranslator } from "@core/shared/i18n/locale";
import Link from "next/link";
import { FinanceDebts } from "../finance-debts";
import styles from "../finance.module.css";

export default async function FinanceReportsPage() {
  await requirePermission("finance.view");
  const { t, locale } = await getTranslator();

  const purchases = await prisma.purchaseOrder.findMany({
    where: { status: { not: "CANCELLED" } },
    include: { supplier: true },
  });

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

      <FinanceDebts
        locale={locale}
        items={purchases
          .filter((o) => D(String(o.total)).sub(o.paidAmount).gt(0))
          .map((o) => ({
            id: o.id,
            supplierName: o.supplier.name,
            orderNumber: o.number,
            amount: D(String(o.total)).sub(o.paidAmount).toString(),
          }))}
      />
    </div>
  );
}
