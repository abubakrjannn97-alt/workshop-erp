import { getTranslator } from "@core/shared/i18n/locale";

import { requirePermission, hasPermission } from "@core/auth/authz";

import { LEDGER } from "@core/finance/finance";

import { buildFinanceMoneyCards, fetchFinanceDashboardData } from "@core/finance/finance-summary";

import { FinanceFundsSection } from "./finance-funds-section";

import { FinanceJournal } from "./finance-journal";

import { FinanceDashboardBody } from "./finance-dashboard-body";

import styles from "./finance.module.css";



const CASH_TYPES = new Set([LEDGER.CASH_IN, LEDGER.CASH_OUT, LEDGER.TRANSFER, LEDGER.REVERSAL]);



export default async function FinancePage() {

  const { t, locale, n } = await getTranslator();

  const session = await requirePermission("finance.view");

  const canManageFunds = hasPermission(session.user.permissions, session.user.roleCode, "finance.expense.create");



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



      <FinanceFundsSection
        locale={locale}
        canManage={canManageFunds}
        funds={data.fundBalances.map((f) => ({
          id: f.id,
          code: f.code,
          name: n("fund", f.code, f.name),
          balance: f.balance.toString(),
          balanceNegative: f.balance.lt(0),
        }))}
      />



      <FinanceJournal locale={locale} items={journalItems} />

    </div>

  );

}

