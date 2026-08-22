import { getTranslator } from "@core/shared/i18n/locale";
import { requirePermission, hasPermission } from "@core/auth/authz";
import { D, moneyDisplay } from "@core/shared/decimal";
import { LEDGER } from "@core/finance/finance";
import { buildFinanceMoneyCards, fetchFinanceDashboardData } from "@core/finance/finance-summary";
import { Banknote, Layers } from "lucide-react";
import { ICON_STROKE } from "@/components/nav-icons";
import { FinanceDebts } from "./finance-debts";
import { FinanceFundsSection } from "./finance-funds-section";
import { FinanceJournal } from "./finance-journal";
import { FinanceDashboardBody } from "./finance-dashboard-body";
import styles from "./finance.module.css";

const CASH_TYPES = new Set([LEDGER.CASH_IN, LEDGER.CASH_OUT, LEDGER.TRANSFER, LEDGER.REVERSAL]);

export default async function FinancePage() {
  const { t, locale, n } = await getTranslator();
  const session = await requirePermission("finance.view");
  const canAddFund = hasPermission(session.user.permissions, session.user.roleCode, "finance.expense.create");

  const data = await fetchFinanceDashboardData();
  const moneyCards = buildFinanceMoneyCards({
    cashBalances: data.cashBalances,
    paymentCards: data.paymentCards,
    payments: data.payments,
    accountLabel: (code, name) => n("cash", code, name),
  });

  const accountName = (id: string | null) => {
    if (!id) return "";
    const a = data.cashBalances.find((x) => x.id === id);
    return a ? n("cash", a.code, a.name) : "";
  };

  const journalItems = data.entries
    .filter((e) => CASH_TYPES.has(e.type))
    .slice(0, 60)
    .map((e) => {
      const kind = t(`ledger.${e.type}`);
      let where = "";
      if (e.type === LEDGER.TRANSFER) {
        where = `${accountName(e.fromAccountId)} → ${accountName(e.toAccountId)}`;
      } else if (e.accountId) {
        where = accountName(e.accountId);
      }
      return {
        id: e.id,
        title: e.comment?.trim() || kind,
        kind,
        where,
        amount: String(e.amount),
        outflow: e.type === LEDGER.CASH_OUT,
        when: e.createdAt.toISOString(),
      };
    });

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <div className={styles.headerText}>
          <h1 className={styles.title}>{t("page.finance")}</h1>
          <p className={styles.subtitle}>{t("fin.hint")}</p>
        </div>
      </header>

      <FinanceDashboardBody
        periodSnapshots={data.periodSnapshots}
        moneyCards={moneyCards}
        periodLabels={{
          today: t("orders.periodToday"),
          week: t("orders.periodWeek"),
          month: t("orders.periodMonth"),
        }}
        netLabel={t("an.net")}
        netOkHint={t("an.netOkSub")}
        netBadHint={t("fin.netBadSubPeriod")}
        netTotalLabel={t("fin.netProfitLabel")}
      />

      <section className={styles.kpiStrip}>
        <article className={`${styles.kpiCard} ${styles.kpiSoft}`}>
          <div className={styles.kpiTop}>
            <span className={`${styles.kpiIcon} ${styles.kpiIconSoft}`}>
              <Layers size={20} strokeWidth={ICON_STROKE} aria-hidden />
            </span>
            <span className={styles.kpiSource}>{t("fin.funds")}</span>
          </div>
          <p className={styles.kpiLabel}>{t("fin.byFunds")}</p>
          <p className={styles.kpiValue}>{moneyDisplay(data.allocated)} с</p>
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
          <p className={data.supplierDebt.gt(0) ? `${styles.kpiValue} ${styles.kpiValueWarn}` : styles.kpiValue}>
            {moneyDisplay(data.supplierDebt)} с
          </p>
          <p className={styles.kpiHint}>{t("fin.supplierDebtHint")}</p>
        </article>
      </section>

      <FinanceFundsSection
        locale={locale}
        canAdd={canAddFund}
        funds={data.fundBalances.map((f) => ({
          id: f.id,
          code: f.code,
          name: n("fund", f.code, f.name),
          balance: f.balance.toString(),
          balanceNegative: f.balance.lt(0),
        }))}
      />

      <FinanceDebts
        locale={locale}
        items={data.purchaseDebts
          .filter((o) => D(String(o.total)).sub(o.paidAmount).gt(0))
          .map((o) => ({
            id: o.id,
            supplierName: o.supplier.name,
            orderNumber: o.number,
            amount: D(String(o.total)).sub(o.paidAmount).toString(),
          }))}
      />

      <FinanceJournal locale={locale} items={journalItems} />
    </div>
  );
}
