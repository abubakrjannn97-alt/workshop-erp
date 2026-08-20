import { prisma } from "@core/infrastructure/prisma";
import { requirePermission, hasPermission } from "@core/auth/authz";
import { moneyDisplay } from "@core/shared/decimal";
import { LEDGER } from "@core/finance/finance";
import { createExpense } from "@/app/actions/finance";
import { getTranslator, intlLocale } from "@core/shared/i18n/locale";
import { FormField } from "@/components/form-field";
import { AppSelect } from "@/components/app-select";
import { IdempotencyField } from "@/components/idempotency-field";
import { PendingButton } from "@/components/pending-button";
import Link from "next/link";
import styles from "../finance.module.css";

export default async function ExpensesPage() {
  const session = await requirePermission("finance.view");
  const { t, locale, n } = await getTranslator();
  const canExpense = hasPermission(session.user.permissions, session.user.roleCode, "finance.expense.create");
  const start = new Date();
  start.setDate(1);
  start.setHours(0, 0, 0, 0);

  const [accounts, categories, entries] = await Promise.all([
    prisma.cashAccount.findMany({ where: { archivedAt: null }, orderBy: { code: "asc" } }),
    prisma.expenseCategory.findMany({ where: { archivedAt: null }, orderBy: { name: "asc" } }),
    prisma.ledgerEntry.findMany({
      where: { status: "POSTED", type: LEDGER.CASH_OUT, createdAt: { gte: start } },
      orderBy: { createdAt: "desc" },
      take: 40,
    }),
  ]);

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <div className={styles.headerText}>
          <h1 className={styles.title}>{t("nav.expenses")}</h1>
          <p className={styles.subtitle}>{t("fin.expensesHint")}</p>
        </div>
        <div className={styles.headerActions}>
          <Link href="/finance" className={styles.ghostLink}>{t("page.finance")}</Link>
        </div>
      </header>

      {canExpense ? (
        <section className={styles.section}>
          <div className={styles.sectionHead}>
            <h2 className={styles.sectionTitle}>{t("fin.expense")}</h2>
          </div>
          <div className={styles.sectionBody}>
            <form action={createExpense} className="grid gap-3">
              <IdempotencyField prefix="expense" />
              <FormField label={t("fin.accounts")}>
                <AppSelect
                  name="accountId"
                  defaultValue={accounts[0]?.id ?? ""}
                  options={accounts.map((a) => ({ value: a.id, label: n("cash", a.code, a.name) }))}
                />
              </FormField>
              <FormField label={t("fin.expenseCat")}>
                <AppSelect
                  name="categoryId"
                  defaultValue={categories[0]?.id ?? ""}
                  options={categories.map((c) => ({ value: c.id, label: c.name }))}
                />
              </FormField>
              <FormField label={`${t("common.amount")}, с`}>
                <input name="amount" required inputMode="decimal" className="ui-input" />
              </FormField>
              <FormField label={t("common.comment")}>
                <input name="comment" className="ui-input" />
              </FormField>
              <PendingButton className="ui-btn-primary min-h-[44px] w-full" pendingLabel={t("common.sending")}>{t("fin.postExpense")}</PendingButton>
            </form>
          </div>
        </section>
      ) : null}

      <section className={styles.section}>
        <div className={styles.sectionHead}>
          <h2 className={styles.sectionTitleAccent}>{t("fin.monthExpenses")}</h2>
        </div>
        {entries.length === 0 ? (
          <div className={styles.empty}>{t("common.empty")}</div>
        ) : (
          <>
            <div className={styles.tableWrap}>
              <table className={styles.table}>
                <thead>
                  <tr>
                    <th>{t("list.col.what")}</th>
                    <th className={styles.thRight}>{t("list.col.sum")}</th>
                  </tr>
                </thead>
                <tbody>
                  {entries.map((e) => (
                    <tr key={e.id}>
                      <td>
                        <span className={styles.tdBold}>{e.comment ?? t("fin.expense")}</span>
                        <p className={styles.tdMuted}>{e.createdAt.toLocaleDateString(intlLocale(locale))}</p>
                      </td>
                      <td className={styles.tdRight}>{moneyDisplay(e.amount)} с</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <ul className={styles.mobileList}>
              {entries.map((e) => (
                <li key={e.id} className={styles.mobileCard}>
                  <p className={styles.mobileName}>{e.comment ?? t("fin.expense")}</p>
                  <p className={styles.mobileMeta}>{e.createdAt.toLocaleDateString(intlLocale(locale))}</p>
                  <p className={styles.mobileValue}>{moneyDisplay(e.amount)} с</p>
                </li>
              ))}
            </ul>
          </>
        )}
      </section>
    </div>
  );
}
