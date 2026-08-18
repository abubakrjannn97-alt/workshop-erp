import { prisma } from "@core/infrastructure/prisma";
import { requirePermission } from "@core/auth/authz";
import { hasPermission } from "@core/auth/authz";
import { moneyDisplay } from "@core/shared/decimal";
import { LEDGER } from "@core/finance/finance";
import { createExpense } from "@/app/actions/finance";
import { getTranslator, intlLocale } from "@core/shared/i18n/locale";
import { PageHeader } from "@/components/page-header";
import { FormField } from "@/components/form-field";
import { IdempotencyField } from "@/components/idempotency-field";
import { PendingButton } from "@/components/pending-button";
import { DashPanel } from "@/components/dash-panel";
import {
  DataList,
  DataListEmpty,
  DataListHead,
  DataListHeadCell,
  DataListMetric,
  DataListPrimary,
  DataListRow,
  dataListStyles,
} from "@/components/data-table";

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
    <div className="page-stack">
      <PageHeader title={t("nav.expenses")} description={t("fin.expensesHint")} />
      {canExpense ? (
        <DashPanel title={t("fin.expense")}>
          <form action={createExpense} className="grid gap-3">
            <IdempotencyField prefix="expense" />
            <FormField label={t("fin.accounts")}>
              <select name="accountId" className="ui-input">
                {accounts.map((a) => (
                  <option key={a.id} value={a.id}>
                    {n("cash", a.code, a.name)}
                  </option>
                ))}
              </select>
            </FormField>
            <FormField label={t("fin.expenseCat")}>
              <select name="categoryId" className="ui-input">
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </FormField>
            <FormField label={`${t("common.amount")}, с`}>
              <input name="amount" required inputMode="decimal" className="ui-input" />
            </FormField>
            <FormField label={t("common.comment")}>
              <input name="comment" className="ui-input" />
            </FormField>
            <PendingButton className="ui-btn-primary min-h-[44px] w-full" pendingLabel={t("common.sending")}>
              {t("fin.postExpense")}
            </PendingButton>
          </form>
        </DashPanel>
      ) : null}
      <DashPanel title={t("fin.monthExpenses")}>
        {entries.length === 0 ? (
          <DataListEmpty>{t("common.empty")}</DataListEmpty>
        ) : (
          <DataList layout="cols2">
            <DataListHead layout="cols2">
              <DataListHeadCell>{t("list.col.what")}</DataListHeadCell>
              <DataListHeadCell align="right">{t("list.col.sum")}</DataListHeadCell>
            </DataListHead>
            <ul className={dataListStyles.rows}>
              {entries.map((e) => (
                <DataListRow key={e.id} layout="cols2">
                  <DataListPrimary
                    title={e.comment ?? t("fin.expense")}
                    subtitle={e.createdAt.toLocaleDateString(intlLocale(locale))}
                  />
                  <DataListMetric label={t("list.col.sum")} value={`${moneyDisplay(e.amount)} с`} />
                </DataListRow>
              ))}
            </ul>
          </DataList>
        )}
      </DashPanel>
    </div>
  );
}
