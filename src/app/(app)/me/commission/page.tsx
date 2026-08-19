import { redirect } from "next/navigation";
import { requireSession } from "@core/auth/authz";
import { prisma } from "@core/infrastructure/prisma";
import { D, moneyDisplay } from "@core/shared/decimal";
import { periodKey, periodRange } from "@core/payroll/payroll";
import { getTranslator } from "@core/shared/i18n/locale";
import { RevealList } from "@/components/reveal-list";
import styles from "@/styles/premium.module.css";

export default async function MyCommissionPage() {
  const session = await requireSession();
  const role = session.user.roleCode;
  if (role !== "sales_manager" && role !== "owner" && role !== "director") redirect("/");
  const { t } = await getTranslator();
  const userId = session.user.id;
  const key = periodKey();
  const { start, end } = periodRange(key);

  const [accruals, orders] = await Promise.all([
    prisma.payrollAccrual.findMany({ where: { userId, kind: "COMMISSION", periodKey: key }, orderBy: { createdAt: "desc" }, take: 30 }),
    prisma.order.findMany({ where: { sellerId: userId, createdAt: { gte: start, lt: end }, status: { code: { not: "CANCELLED" } } }, include: { customer: true } }),
  ]);
  const earned = accruals.filter((a) => a.status === "ACCRUED").reduce((s, a) => s.add(String(a.amount)), D(0));
  const paid = orders.reduce((s, o) => s.add(String(o.paidAmount)), D(0));

  return (
    <div className={styles.page}>
      <header className={styles.header}><div className={styles.headerText}><h1 className={styles.title}>{t("nav.commission")}</h1><p className={styles.subtitle}>{t("me.commissionHint")}</p></div></header>
      <div className={styles.twoCol}>
        <div className={styles.kpiBox}><p className={styles.kpiLabel}>{t("me.earned")}</p><p className={styles.kpiValue}>{moneyDisplay(earned)} с</p></div>
        <div className={styles.kpiBox}><p className={styles.kpiLabel}>{t("emp.clientPaid")}</p><p className={styles.kpiValue}>{moneyDisplay(paid)} с</p></div>
      </div>
      <section className={styles.section}>
        <div className={styles.sectionHead}><h2 className={styles.sectionTitle}>{t("emp.accruals")}</h2></div>
        <div className={styles.sectionBody}>
          {accruals.length === 0 ? <p style={{ fontSize: 14, color: "var(--ink-3)" }}>{t("emp.noneYet")}</p> : (
            <RevealList moreLabel={t("home.seeAll")} lessLabel={t("home.hide")} limit={8}>
              {accruals.map((a) => (
                <li key={a.id} style={{ display: "flex", justifyContent: "space-between", padding: "6px 0", borderBottom: "1px solid var(--line)", fontSize: 13 }}>
                  <span style={{ color: "var(--ink-2)" }}>{a.comment ?? t("emp.commission")}</span>
                  <span style={{ fontFamily: "var(--font-mono)", fontSize: 12, fontWeight: 600 }}>{moneyDisplay(a.amount)} с</span>
                </li>
              ))}
            </RevealList>
          )}
        </div>
      </section>
    </div>
  );
}
