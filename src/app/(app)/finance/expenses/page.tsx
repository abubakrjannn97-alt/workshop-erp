import { prisma } from "@core/infrastructure/prisma";
import { requirePermission, hasPermission } from "@core/auth/authz";
import { moneyDisplay, D } from "@core/shared/decimal";
import { LEDGER } from "@core/finance/finance";
import { createExpense } from "@/app/actions/finance";
import { getTranslator, intlLocale } from "@core/shared/i18n/locale";
import { orderPeriodLabel, resolveOrderDateRange, type OrderPeriod } from "@core/shared/order-period";
import { FormField } from "@/components/form-field";
import { AppSelect } from "@/components/app-select";
import { IdempotencyField } from "@/components/idempotency-field";
import { PendingButton } from "@/components/pending-button";
import { FilterPillRow } from "@/components/filter-pill-row";
import { ExpensesMonthList } from "../expenses-month-list";
import styles from "../finance.module.css";

type Period = Extract<OrderPeriod, "today" | "week" | "month" | "all">;

function parsePeriod(raw?: string): Period {
  if (raw === "today" || raw === "week" || raw === "month" || raw === "all") return raw;
  return "month";
}

export default async function ExpensesPage({
  searchParams,
}: {
  searchParams: Promise<{ period?: string }>;
}) {
  const session = await requirePermission("finance.view");
  const { t, locale, n } = await getTranslator();
  const params = await searchParams;
  const period = parsePeriod(params.period);
  const range = resolveOrderDateRange({ period });
  const loc = intlLocale(locale);
  const canExpense = hasPermission(session.user.permissions, session.user.roleCode, "finance.expense.create");

  const dateFilter =
    range.from && range.to ? { gte: range.from, lte: range.to } : undefined;

  const [accounts, categories, entries] = await Promise.all([
    prisma.cashAccount.findMany({ where: { archivedAt: null }, orderBy: { code: "asc" } }),
    prisma.expenseCategory.findMany({ where: { archivedAt: null }, orderBy: { name: "asc" } }),
    prisma.ledgerEntry.findMany({
      where: { status: "POSTED", type: LEDGER.CASH_OUT, ...(dateFilter ? { createdAt: dateFilter } : {}) },
      orderBy: { createdAt: "desc" },
      take: 80,
    }),
  ]);

  const total = entries.reduce((s, e) => s.add(String(e.amount)), D(0));
  const defaultAccountId = accounts.find((a) => a.code === "CASH")?.id ?? accounts[0]?.id ?? "";
  const rangeLabel = orderPeriodLabel(period, t, range.from, range.to);
  const expenseRows = entries.map((e) => ({
    id: e.id,
    comment: e.comment,
    amount: String(e.amount),
    dateLabel: e.createdAt.toLocaleDateString(loc),
  }));

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <div className={styles.headerText}>
          <h1 className={styles.title}>{t("nav.expenses")}</h1>
          <p className={styles.subtitle}>{t("fin.expensesHint")}</p>
        </div>
      </header>

      <div className={styles.periodWrap}>
        <FilterPillRow
          aria-label={t("po.period")}
          items={[
            { href: "/finance/expenses?period=today", label: t("orders.periodToday"), active: period === "today" },
            { href: "/finance/expenses?period=week", label: t("po.periodWeek"), active: period === "week" },
            { href: "/finance/expenses?period=month", label: t("po.periodMonth"), active: period === "month" },
            { href: "/finance/expenses?period=all", label: t("orders.periodAll"), active: period === "all" },
          ]}
        />
      </div>

      <section className={styles.expenseReport}>
        <p className={styles.expenseReportEyebrow}>{t("fin.periodExpenses")}</p>
        <p className={styles.expenseReportRange}>{rangeLabel}</p>
        <p className={styles.expenseReportTotal}>{moneyDisplay(total)} с</p>
        <p className={styles.expenseReportCount}>{t("fin.expenseCount", { n: String(entries.length) })}</p>
      </section>

      {canExpense ? (
        <section className={styles.section} data-tour="fin-expense">
          <div className={`${styles.sectionHead} ${styles.sectionHeadForm}`}>
            <h2 className={styles.sectionTitle}>{t("fin.expense")}</h2>
          </div>
          <div className={styles.sectionBody}>
            <form action={createExpense} className="grid gap-3">
              <IdempotencyField prefix="expense" />
              <FormField label={t("fin.accounts")}>
                <AppSelect
                  name="accountId"
                  defaultValue={defaultAccountId}
                  options={accounts.map((a) => ({ value: a.id, label: n("cash", a.code, a.name) }))}
                />
              </FormField>
              <FormField label={t("fin.expenseCat")}>
                <AppSelect
                  name="categoryId"
                  defaultValue=""
                  required
                  placeholder={t("fin.pickCategory")}
                  options={categories.map((c) => ({ value: c.id, label: c.name }))}
                />
              </FormField>
              <FormField label={`${t("common.amount")}, с`}>
                <input name="amount" required inputMode="decimal" placeholder={t("common.amount")} className="ui-input" />
              </FormField>
              <PendingButton className="ui-btn-primary min-h-[44px] w-full" pendingLabel={t("common.sending")}>
                {t("fin.postExpense")}
              </PendingButton>
            </form>
          </div>
        </section>
      ) : null}

      <section className={styles.section}>
        <ExpensesMonthList locale={locale} entries={expenseRows} />
      </section>
    </div>
  );
}
