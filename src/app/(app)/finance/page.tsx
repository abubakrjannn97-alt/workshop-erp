import { getTranslator } from "@core/shared/i18n/locale";
import { requirePermission } from "@core/auth/authz";
import { D, moneyDisplay } from "@core/shared/decimal";
import { FUND, LEDGER } from "@core/finance/finance";
import { buildMoneyLocationCards, fetchFinanceDashboardData } from "@core/finance/finance-summary";
import { Banknote, Layers, TrendingUp } from "lucide-react";
import { ICON_STROKE } from "@/components/nav-icons";
import { FinanceDebts } from "./finance-debts";
import { FinanceJournal } from "./finance-journal";
import styles from "./finance.module.css";

const CASH_TYPES = new Set([LEDGER.CASH_IN, LEDGER.CASH_OUT, LEDGER.TRANSFER, LEDGER.REVERSAL]);

export default async function FinancePage() {
  const { t, locale, n } = await getTranslator();
  await requirePermission("finance.view");

  const data = await fetchFinanceDashboardData();
  const netPositive = data.netProfit.gte(0);
  const moneyCards = buildMoneyLocationCards({
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

      <section className={styles.kpiBoard} data-tour="fin-money" aria-label={t("page.finance")}>
        <article className={`${styles.kpiCard} ${styles.kpiHero} ${netPositive ? styles.kpiHeroOk : styles.kpiHeroBad}`}>
          <div className={styles.kpiTop}>
            <span className={`${styles.kpiIcon} ${styles.kpiIconHero}`}>
              <TrendingUp size={22} strokeWidth={ICON_STROKE} aria-hidden />
            </span>
            <span className={styles.kpiSource}>{t("fin.netProfitLabel")}</span>
          </div>
          <p className={styles.kpiLabel}>{t("an.net")}</p>
          <p className={styles.kpiHeroValue}>
            {netPositive ? "" : "−"}
            {moneyDisplay(data.netProfit.abs())} с
          </p>
          <p className={styles.kpiHint}>{netPositive ? t("an.netOkSub") : t("an.netBadSub")}</p>
        </article>
      </section>

      {moneyCards.length > 0 ? (
        <section className={styles.moneyWhereSection}>
          <h2 className={styles.moneyWhereTitle}>{t("fin.moneyWhere")}</h2>
          <ul className={styles.moneyCardGrid}>
            {moneyCards.map((card) => (
              <li key={card.id} className={styles.moneyCard}>
                <div className={styles.moneyCardTop}>
                  {card.logoUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={card.logoUrl} alt="" className={styles.moneyCardLogo} />
                  ) : (
                    <span className={styles.moneyCardIcon} aria-hidden>
                      {card.kind === "cash" ? "💵" : "💳"}
                    </span>
                  )}
                  <span className={styles.moneyCardLabel}>{card.label}</span>
                </div>
                <p className={card.amount.lt(0) ? styles.moneyCardValueBad : styles.moneyCardValue}>
                  {moneyDisplay(card.amount)} с
                </p>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

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

      <section className={styles.section}>
        <div className={styles.sectionHead}>
          <h2 className={styles.sectionTitleAccent}>{t("fin.funds")}</h2>
        </div>
        <div className={styles.sectionBody}>
          <ul className={styles.balanceList}>
            {data.fundBalances.map((f) => (
              <li key={f.id} className={styles.balanceRow}>
                <span className={styles.balanceName}>{n("fund", f.code, f.name)}</span>
                <span className={f.code === FUND.PROFIT ? styles.balanceValueAccent : styles.balanceValue}>
                  {moneyDisplay(f.balance)} с
                </span>
              </li>
            ))}
          </ul>
        </div>
      </section>

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
