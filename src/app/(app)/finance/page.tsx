import { getTranslator, intlLocale } from "@core/shared/i18n/locale";
import { prisma } from "@core/infrastructure/prisma";
import { requirePermission } from "@core/auth/authz";
import { hasPermission } from "@core/auth/authz";
import { D, moneyDisplay } from "@core/shared/decimal";
import { cashDelta, fundDelta, FUND } from "@core/finance/finance";
import { createExpense, createExpenseCategory, createObligation, transferCash } from "@/app/actions/finance";
import { closeCashShift, openCashShift } from "@/app/actions/control";
import { KpiCard } from "@/components/kpi-card";
import { RevealList } from "@/components/reveal-list";
import { PageHeader } from "@/components/page-header";
import { IdempotencyField } from "@/components/idempotency-field";
import { PendingButton } from "@/components/pending-button";
import { DashKpiGrid } from "@/components/dashboard/dashboard-system";
import { DashPanel } from "@/components/dash-panel";
import { FormField } from "@/components/form-field";
import {
  DataList,
  DataListEmpty,
  DataListHead,
  DataListHeadCell,
  DataListMetric,
  DataListPrimary,
  DataListRow,
  DataTableSection,
  dataListStyles,
} from "@/components/data-table";

export default async function FinancePage() {
  const { t, locale, n } = await getTranslator();
  const session = await requirePermission("finance.view");
  const canExpense = hasPermission(session.user.permissions, session.user.roleCode, "finance.expense.create");
  const canTransfer = hasPermission(session.user.permissions, session.user.roleCode, "finance.transfer");

  const [accounts, funds, categories, entries, obligations, purchaseDebts, shifts] = await Promise.all([
    prisma.cashAccount.findMany({ where: { archivedAt: null }, orderBy: { code: "asc" } }),
    prisma.financialFund.findMany({ orderBy: { sortOrder: "asc" } }),
    prisma.expenseCategory.findMany({ where: { archivedAt: null }, orderBy: { name: "asc" } }),
    prisma.ledgerEntry.findMany({ where: { status: "POSTED" }, orderBy: { createdAt: "desc" } }),
    prisma.obligation.findMany({ where: { status: "OPEN" }, orderBy: { createdAt: "desc" } }),
    prisma.purchaseOrder.findMany({
      where: { status: { not: "CANCELLED" } },
      include: { supplier: true },
    }),
    prisma.cashShift.findMany({ where: { status: { in: ["OPEN", "PENDING_CLOSE"] } }, orderBy: { openedAt: "desc" } }),
  ]);

  const cashBalances = accounts.map((a) => ({
    ...a,
    balance: entries.reduce((s, e) => s.add(cashDelta(e, a.id)), D(0)),
  }));
  const fundBalances = funds.map((f) => ({
    ...f,
    balance: entries.reduce((s, e) => s.add(fundDelta(e, f.id)), D(0)),
  }));
  const physical = cashBalances.reduce((s, a) => s.add(a.balance), D(0));
  const allocated = fundBalances.reduce((s, f) => s.add(f.balance), D(0));
  const supplierDebt = purchaseDebts.reduce((s, o) => s.add(D(String(o.total)).sub(o.paidAmount)), D(0));
  const otherDebt = obligations.reduce((s, o) => s.add(D(String(o.amount)).sub(o.paidAmount)), D(0));

  async function expenseAction(formData: FormData) {
    "use server";
    await createExpense(formData);
  }
  async function transferAction(formData: FormData) {
    "use server";
    await transferCash(formData);
  }
  async function obligationAction(formData: FormData) {
    "use server";
    await createObligation(formData);
  }
  async function categoryAction(formData: FormData) {
    "use server";
    await createExpenseCategory(formData);
  }
  async function openShift(formData: FormData) {
    "use server";
    await openCashShift(formData);
  }
  async function closeShift(formData: FormData) {
    "use server";
    await closeCashShift(formData);
  }

  return (
    <div className="page-stack">
      <PageHeader title={t("page.finance")} description={t("fin.hint")} />

      <DashKpiGrid cols="3" tour="fin-money">
        <KpiCard label={t("fin.physical")} value={`${moneyDisplay(physical)} с`} hint={t("home.period")} tone="in" />
        <KpiCard label={t("fin.byFunds")} value={`${moneyDisplay(allocated)} с`} tone="ink" />
        <KpiCard label={t("fin.supplierDebt")} value={`${moneyDisplay(supplierDebt.add(otherDebt))} с`} tone="out" />
      </DashKpiGrid>

      <section className="grid gap-2 lg:grid-cols-2">
        <DashPanel title={t("fin.accounts")}>
          <DataList layout="cols2">
            <DataListHead layout="cols2">
              <DataListHeadCell>{t("fin.accounts")}</DataListHeadCell>
              <DataListHeadCell align="right">{t("home.col.balance")}</DataListHeadCell>
            </DataListHead>
            <ul className={dataListStyles.rows}>
              {cashBalances.map((a) => (
                <DataListRow key={a.id} layout="cols2">
                  <DataListPrimary title={n("cash", a.code, a.name)} />
                  <DataListMetric label={t("home.col.balance")} value={`${moneyDisplay(a.balance)} с`} />
                </DataListRow>
              ))}
            </ul>
          </DataList>
        </DashPanel>
        <DashPanel title={t("fin.funds")}>
          <DataList layout="cols2">
            <DataListHead layout="cols2">
              <DataListHeadCell>{t("home.col.fund")}</DataListHeadCell>
              <DataListHeadCell align="right">{t("home.col.balance")}</DataListHeadCell>
            </DataListHead>
            <ul className={dataListStyles.rows}>
              {fundBalances.map((f) => (
                <DataListRow key={f.id} layout="cols2">
                  <DataListPrimary title={n("fund", f.code, f.name)} />
                  <DataListMetric
                    label={t("home.col.balance")}
                    value={`${moneyDisplay(f.balance)} с`}
                    tone={f.code === FUND.PROFIT ? "gold" : "default"}
                  />
                </DataListRow>
              ))}
            </ul>
          </DataList>
        </DashPanel>
      </section>

      <DashPanel title={t("fin.shift")} tour="fin-shift">
        <form action={openShift} className="ui-card flex flex-wrap items-end gap-2 p-3">
          <FormField label={t("fin.accounts")} className="min-w-[10rem] flex-1">
            <select name="accountId" className="ui-input">
              {accounts.map((a) => (
                <option key={a.id} value={a.id}>
                  {n("cash", a.code, a.name)}
                </option>
              ))}
            </select>
          </FormField>
          <FormField label={t("fin.openBalance")} className="min-w-[8rem]">
            <input name="openingAmount" placeholder={t("fin.openBalance")} className="ui-input" />
          </FormField>
          <div className="flex items-end">
            <button type="submit" className="ui-btn-primary min-h-[44px]">
              {t("fin.openShift")}
            </button>
          </div>
        </form>
        <ul className="mt-3 space-y-3 text-sm">
          {shifts.length === 0 ? (
            <li className="text-[var(--muted)]">{t("fin.noShifts")}</li>
          ) : (
            shifts.map((s) => {
              const acc = accounts.find((a) => a.id === s.accountId);
              const expected = cashBalances.find((a) => a.id === s.accountId)?.balance;
              return (
                <li key={s.id} className="rounded-lg border border-[var(--line)] p-3">
                  <p>
                    {acc?.name} · {t("fin.openedAt")} {s.openedAt.toLocaleString(intlLocale(locale))} · {t("fin.start")}{" "}
                    {moneyDisplay(s.openingAmount)} с
                  </p>
                  <p className="text-xs text-[var(--muted)]">
                    {t("fin.expectedNow")}: {expected ? moneyDisplay(expected) : "—"} с
                  </p>
                  <form action={closeShift} className="mt-2 flex flex-wrap items-end gap-2">
                    <input type="hidden" name="id" value={s.id} />
                    <FormField label={t("fin.closeBalance")} className="min-w-[8rem]">
                      <input name="closingActual" placeholder={t("fin.closeBalance")} className="ui-input" />
                    </FormField>
                    <FormField label={t("fin.diffReason")} className="min-w-[10rem] flex-1">
                      <input name="comment" placeholder={t("fin.diffReason")} className="ui-input" />
                    </FormField>
                    <button type="submit" className="ui-btn-secondary min-h-[44px]">
                      {t("common.close")}
                    </button>
                  </form>
                </li>
              );
            })
          )}
        </ul>
      </DashPanel>

      {canExpense || canTransfer ? (
        <section className="grid gap-2 lg:grid-cols-2">
          {canExpense ? (
            <DashPanel title={t("fin.expense")} tour="fin-expense">
              <form action={expenseAction} className="grid gap-3">
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
                  <input name="amount" placeholder={t("common.amount")} className="ui-input" inputMode="decimal" />
                </FormField>
                <FormField label={t("common.comment")}>
                  <input name="comment" placeholder={t("common.comment")} className="ui-input" />
                </FormField>
                <PendingButton className="ui-btn-primary min-h-[44px]" pendingLabel={t("common.sending")}>
                  {t("fin.postExpense")}
                </PendingButton>
              </form>
            </DashPanel>
          ) : null}
          {canTransfer ? (
            <DashPanel title={t("fin.transfer")}>
              <form action={transferAction} className="grid gap-3">
                <FormField label={t("fin.from")}>
                  <select name="fromAccountId" className="ui-input">
                    {accounts.map((a) => (
                      <option key={a.id} value={a.id}>
                        {n("cash", a.code, a.name)}
                      </option>
                    ))}
                  </select>
                </FormField>
                <FormField label={t("fin.to")}>
                  <select name="toAccountId" className="ui-input">
                    {accounts.map((a) => (
                      <option key={a.id} value={a.id}>
                        {n("cash", a.code, a.name)}
                      </option>
                    ))}
                  </select>
                </FormField>
                <FormField label={`${t("common.amount")}, с`}>
                  <input name="amount" placeholder={t("common.amount")} className="ui-input" inputMode="decimal" />
                </FormField>
                <FormField label={t("common.comment")}>
                  <input name="comment" placeholder={t("common.comment")} className="ui-input" />
                </FormField>
                <button type="submit" className="ui-btn-primary min-h-[44px]">
                  {t("fin.transferBtn")}
                </button>
              </form>
            </DashPanel>
          ) : null}
        </section>
      ) : null}

      {canExpense ? (
        <section className="grid gap-2 lg:grid-cols-2">
          <DashPanel title={t("fin.obligation")}>
            <form action={obligationAction} className="grid gap-3">
              <FormField label={t("common.name")}>
                <input name="name" placeholder={t("common.name")} className="ui-input" />
              </FormField>
              <select name="kind" className="ui-input" aria-label={t("fin.obligation")}>
                  <option value="other">{t("fin.other")}</option>
                  <option value="supplier">{t("common.supplier")}</option>
                  <option value="tax">{t("fin.tax")}</option>
                </select>
              <FormField label={`${t("common.amount")}, с`}>
                <input name="amount" placeholder={t("common.amount")} className="ui-input" inputMode="decimal" />
              </FormField>
              <button type="submit" className="ui-btn-primary min-h-[44px]">
                {t("common.add")}
              </button>
            </form>
          </DashPanel>
          <DashPanel title={t("fin.expenseCat")}>
            <form action={categoryAction} className="grid gap-3">
              <FormField label={t("common.code")}>
                <input name="code" placeholder={t("common.code")} className="ui-input" />
              </FormField>
              <FormField label={t("common.name")}>
                <input name="name" placeholder={t("common.name")} className="ui-input" />
              </FormField>
              <FormField label={t("home.col.fund")}>
                <select name="fundCode" className="ui-input">
                  {funds.map((f) => (
                    <option key={f.code} value={f.code}>
                      {n("fund", f.code, f.name)}
                    </option>
                  ))}
                </select>
              </FormField>
              <button type="submit" className="ui-btn-primary min-h-[44px]">
                {t("fin.saveCat")}
              </button>
            </form>
          </DashPanel>
        </section>
      ) : null}

      <DashPanel title={t("fin.obligations")}>
        <DataList layout="cols2">
          <DataListHead layout="cols2">
            <DataListHeadCell>{t("list.col.what")}</DataListHeadCell>
            <DataListHeadCell align="right">{t("common.debt")}</DataListHeadCell>
          </DataListHead>
          <RevealList moreLabel={t("home.seeAll")} lessLabel={t("home.hide")} limit={5} className={dataListStyles.rows}>
            {purchaseDebts
              .filter((o) => D(String(o.total)).sub(o.paidAmount).gt(0))
              .map((o) => (
                <DataListRow key={o.id} layout="cols2">
                  <DataListPrimary title={o.supplier.name} subtitle={`${t("fin.supplierOf")} · ${o.number}`} />
                  <DataListMetric
                    label={t("common.debt")}
                    value={`${moneyDisplay(D(String(o.total)).sub(o.paidAmount))} с`}
                    tone="bad"
                  />
                </DataListRow>
              ))}
            {obligations.map((o) => (
              <DataListRow key={o.id} layout="cols2">
                <DataListPrimary title={o.name} />
                <DataListMetric
                  label={t("common.debt")}
                  value={`${moneyDisplay(D(String(o.amount)).sub(o.paidAmount))} с`}
                  tone="bad"
                />
              </DataListRow>
            ))}
          </RevealList>
        </DataList>
      </DashPanel>

      <DataTableSection>
        <div className="border-b border-[var(--line)] px-5 py-3">
          <h2 className="section-title">{t("set.audit")}</h2>
        </div>
        {entries.length === 0 ? (
          <DataListEmpty>{t("fin.noEntries")}</DataListEmpty>
        ) : (
          <DataList layout="cols3">
            <DataListHead layout="cols3">
              <DataListHeadCell>{t("list.col.what")}</DataListHeadCell>
              <DataListHeadCell align="right">{t("list.col.sum")}</DataListHeadCell>
              <DataListHeadCell align="right">{t("list.col.when")}</DataListHeadCell>
            </DataListHead>
            <RevealList moreLabel={t("home.seeAll")} lessLabel={t("home.hide")} className={dataListStyles.rows}>
              {entries.slice(0, 80).map((e) => (
                <DataListRow key={e.id} layout="cols3">
                  <DataListPrimary title={e.type} subtitle={e.comment ?? undefined} />
                  <DataListMetric label={t("list.col.sum")} value={`${moneyDisplay(e.amount)} с`} />
                  <DataListMetric
                    label={t("list.col.when")}
                    value={e.createdAt.toLocaleString(intlLocale(locale))}
                    tone="muted"
                  />
                </DataListRow>
              ))}
            </RevealList>
          </DataList>
        )}
      </DataTableSection>
    </div>
  );
}
