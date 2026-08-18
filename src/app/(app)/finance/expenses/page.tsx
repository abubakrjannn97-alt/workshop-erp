import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/authz";
import { hasPermission } from "@/lib/authz";
import { moneyDisplay } from "@core/shared/decimal";
import { LEDGER } from "@core/finance/finance";
import { createExpense } from "@/app/actions/finance";
import { getTranslator, intlLocale } from "@/lib/locale";
import { PageHeader } from "@/components/page-header";
import { FormField } from "@/components/form-field";
import { IdempotencyField } from "@/components/idempotency-field";
import { PendingButton } from "@/components/pending-button";

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
        <form action={createExpense} className="space-y-3 ui-card p-4">
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
          <PendingButton className="ui-btn-primary w-full" pendingLabel={t("common.sending")}>
            {t("fin.postExpense")}
          </PendingButton>
        </form>
      ) : null}
      <section className="ui-card">
        <h2 className="text-sm font-semibold">{t("fin.monthExpenses")}</h2>
        <ul className="mt-2 space-y-1 text-sm">
          {entries.length === 0 ? (
            <li className="text-[var(--muted)]">{t("common.empty")}</li>
          ) : (
            entries.map((e) => (
              <li key={e.id} className="flex justify-between gap-2">
                <span className="truncate">{e.comment ?? t("fin.expense")}</span>
                <span className="shrink-0 font-mono text-xs">
                  {moneyDisplay(e.amount)} с · {e.createdAt.toLocaleDateString(intlLocale(locale))}
                </span>
              </li>
            ))
          )}
        </ul>
      </section>
    </div>
  );
}
