import { getTranslator, intlLocale } from "@core/shared/i18n/locale";
import { prisma } from "@core/infrastructure/prisma";
import { requirePermission, hasPermission } from "@core/auth/authz";
import { D, moneyDisplay } from "@core/shared/decimal";
import { cashDelta, fundDelta, FUND } from "@core/finance/finance";
import { RevealList } from "@/components/reveal-list";
import { Banknote, Layers, Receipt, Wallet } from "lucide-react";
import { ICON_STROKE } from "@/components/nav-icons";
import { FinanceDebts } from "./finance-debts";
import Link from "next/link";
import styles from "./finance.module.css";

export default async function FinancePage() {
  const { t, locale, n } = await getTranslator();
  const session = await requirePermission("finance.view");
  const canExpense = hasPermission(session.user.permissions, session.user.roleCode, "finance.expense.create");

  const [accounts, funds, entries, purchaseDebts] = await Promise.all([
    prisma.cashAccount.findMany({ where: { archivedAt: null }, orderBy: { code: "asc" } }),
    prisma.financialFund.findMany({ orderBy: { sortOrder: "asc" } }),
    prisma.ledgerEntry.findMany({ where: { status: "POSTED" }, orderBy: { createdAt: "desc" } }),
    prisma.purchaseOrder.findMany({ where: { status: { not: "CANCELLED" } }, include: { supplier: true } }),
  ]);

  const cashBalances = accounts.map((a) => ({ ...a, balance: entries.reduce((s, e) => s.add(cashDelta(e, a.id)), D(0)) }));
  const fundBalances = funds.map((f) => ({ ...f, balance: entries.reduce((s, e) => s.add(fundDelta(e, f.id)), D(0)) }));
  const physical = cashBalances.reduce((s, a) => s.add(a.balance), D(0));
  const allocated = fundBalances.reduce((s, f) => s.add(f.balance), D(0));
  const supplierDebt = purchaseDebts.reduce((s, o) => s.add(D(String(o.total)).sub(o.paidAmount)), D(0));

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <div className={styles.headerText}>
          <h1 className={styles.title}>{t("page.finance")}</h1>
          <p className={styles.subtitle}>{t("fin.hint")}</p>
        </div>
        {canExpense ? (
          <div className={styles.headerActions}>
            <Link href="/finance/expenses" className="ui-btn-primary min-h-[44px] inline-flex items-center gap-2">
              <Receipt size={18} strokeWidth={ICON_STROKE} aria-hidden />
              {t("nav.expenses")}
            </Link>
          </div>
        ) : null}
      </header>

      <section className={styles.kpiBoard} data-tour="fin-money" aria-label={t("page.finance")}>
        <article className={`${styles.kpiCard} ${styles.kpiHero}`}>
          <div className={styles.kpiTop}>
            <span className={`${styles.kpiIcon} ${styles.kpiIconHero}`}>
              <Wallet size={22} strokeWidth={ICON_STROKE} aria-hidden />
            </span>
            <span className={styles.kpiSource}>{t("fin.accounts")}</span>
          </div>
          <p className={styles.kpiLabel}>{t("fin.physical")}</p>
          <p className={styles.kpiHeroValue}>{moneyDisplay(physical)} с</p>
          <p className={styles.kpiHint}>{t("fin.physicalHint")}</p>
        </article>

        <article className={`${styles.kpiCard} ${styles.kpiSoft}`}>
          <div className={styles.kpiTop}>
            <span className={`${styles.kpiIcon} ${styles.kpiIconSoft}`}>
              <Layers size={20} strokeWidth={ICON_STROKE} aria-hidden />
            </span>
            <span className={styles.kpiSource}>{t("fin.funds")}</span>
          </div>
          <p className={styles.kpiLabel}>{t("fin.byFunds")}</p>
          <p className={styles.kpiValue}>{moneyDisplay(allocated)} с</p>
          <p className={styles.kpiHint}>{t("fin.byFundsHint")}</p>
        </article>

        <article className={`${styles.kpiCard} ${styles.kpiWarn}`}>
          <div className={styles.kpiTop}>
            <span className={`${styles.kpiIcon} ${styles.kpiIconWarn}`}>
              <Banknote size={20} strokeWidth={ICON_STROKE} aria-hidden />
            </span>
            <span className={styles.kpiSource}>{t("common.debt")}</span>
          </div>
          <p className={styles.kpiLabel}>{t("fin.supplierDebt")}</p>
          <p className={supplierDebt.gt(0) ? `${styles.kpiValue} ${styles.kpiValueWarn}` : styles.kpiValue}>
            {moneyDisplay(supplierDebt)} с
          </p>
          <p className={styles.kpiHint}>{t("fin.supplierDebtHint")}</p>
        </article>
      </section>

      <div className={styles.twoCol}>
        <section className={styles.section}>
          <div className={styles.sectionHead}>
            <h2 className={styles.sectionTitleAccent}>{t("fin.accounts")}</h2>
          </div>
          <div className={styles.sectionBody}>
            <ul className={styles.balanceList}>
              {cashBalances.map((a) => (
                <li key={a.id} className={styles.balanceRow}>
                  <span className={styles.balanceName}>{n("cash", a.code, a.name)}</span>
                  <span className={styles.balanceValue}>{moneyDisplay(a.balance)} с</span>
                </li>
              ))}
            </ul>
          </div>
        </section>
        <section className={styles.section}>
          <div className={styles.sectionHead}>
            <h2 className={styles.sectionTitleAccent}>{t("fin.funds")}</h2>
          </div>
          <div className={styles.sectionBody}>
            <ul className={styles.balanceList}>
              {fundBalances.map((f) => (
                <li key={f.id} className={styles.balanceRow}>
                  <span className={styles.balanceName}>{n("fund", f.code, f.name)}</span>
                  <span className={f.code === FUND.PROFIT ? styles.balanceValueAccent : styles.balanceValue}>{moneyDisplay(f.balance)} с</span>
                </li>
              ))}
            </ul>
          </div>
        </section>
      </div>

      <FinanceDebts
        locale={locale}
        items={purchaseDebts
          .filter((o) => D(String(o.total)).sub(o.paidAmount).gt(0))
          .map((o) => ({
            id: o.id,
            supplierName: o.supplier.name,
            orderNumber: o.number,
            amount: D(String(o.total)).sub(o.paidAmount).toString(),
          }))}
      />

      <section className={styles.section}>
        <div className={styles.sectionHead}>
          <h2 className={styles.sectionTitle}>{t("set.audit")}</h2>
        </div>
        {entries.length === 0 ? (
          <div className={styles.empty}>{t("fin.noEntries")}</div>
        ) : (
          <>
            <div className={styles.tableWrap}>
              <table className={styles.table}>
                <thead>
                  <tr>
                    <th>{t("list.col.what")}</th>
                    <th className={styles.thRight}>{t("list.col.sum")}</th>
                    <th className={styles.thRight}>{t("list.col.when")}</th>
                  </tr>
                </thead>
                <RevealList as="tbody" moreLabel={t("home.seeAll")} lessLabel={t("home.hide")} limit={15}>
                  {entries.slice(0, 80).map((e) => (
                    <tr key={e.id}>
                      <td>
                        <span className={styles.tdBold}>{e.type}</span>
                        {e.comment ? <p className={styles.tdMuted}>{e.comment}</p> : null}
                      </td>
                      <td className={styles.tdRight}>{moneyDisplay(e.amount)} с</td>
                      <td className={`${styles.tdRight} ${styles.tdMuted}`}>{e.createdAt.toLocaleString(intlLocale(locale))}</td>
                    </tr>
                  ))}
                </RevealList>
              </table>
            </div>
            <ul className={styles.mobileList}>
              {entries.slice(0, 30).map((e) => (
                <li key={e.id} className={styles.mobileCard}>
                  <p className={styles.mobileName}>{e.type}</p>
                  {e.comment ? <p className={styles.mobileMeta}>{e.comment}</p> : null}
                  <p className={styles.mobileValue}>{moneyDisplay(e.amount)} с</p>
                  <p className={styles.mobileMeta}>{e.createdAt.toLocaleString(intlLocale(locale))}</p>
                </li>
              ))}
            </ul>
          </>
        )}
      </section>
    </div>
  );
}
