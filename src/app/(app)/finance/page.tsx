import { getTranslator, intlLocale } from "@/lib/locale";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/authz";
import { hasPermission } from "@/lib/authz";
import { D, moneyDisplay } from "@/lib/decimal";
import { cashDelta, fundDelta, FUND } from "@/lib/finance";
import { createExpense, createExpenseCategory, createObligation, transferCash } from "@/app/actions/finance";
import { closeCashShift, openCashShift } from "@/app/actions/control";
import { KpiCard } from "@/components/kpi-card";
import { RevealList } from "@/components/reveal-list";
import { PageHeader } from "@/components/page-header";
import { IdempotencyField } from "@/components/idempotency-field";
import { PendingButton } from "@/components/pending-button";
import {
  DataList,
  DataListEmpty,
  DataListHead,
  DataListHeadCell,
  DataListMetric,
  DataListPrimary,
  DataListRow,
  dataListStyles,
} from "@/components/data-list";

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

      <div className="grid gap-2 sm:grid-cols-3" data-tour="fin-money">
        <KpiCard label={t("fin.physical")} value={`${moneyDisplay(physical)} с`} hint={t("home.period")} tone="in" />
        <KpiCard label={t("fin.byFunds")} value={`${moneyDisplay(allocated)} с`} tone="ink" />
        <KpiCard label={t("fin.supplierDebt")} value={`${moneyDisplay(supplierDebt.add(otherDebt))} с`} tone="out" />
      </div>

      <section className="grid gap-2 lg:grid-cols-2">
        <div className="ui-card overflow-hidden">
          <h2 className="section-title">{t("fin.accounts")}</h2>
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
        </div>
        <div className="ui-card overflow-hidden">
          <h2 className="section-title">{t("fin.funds")}</h2>
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
        </div>
      </section>

      <section className="ui-card" data-tour="fin-shift">
        <h2 className="text-sm font-semibold">{t("fin.shift")}</h2>
        <form action={openShift} className="mt-3 flex flex-wrap gap-2">
          <select name="accountId" className="rounded-lg border border-[var(--border)] px-3 py-2 text-sm">
            {accounts.map((a) => (
              <option key={a.id} value={a.id}>
                {n("cash", a.code, a.name)}
              </option>
            ))}
          </select>
          <input name="openingAmount" placeholder={t("fin.openBalance")} className="rounded-lg border border-[var(--border)] px-3 py-2 text-sm" />
          <button className="ui-btn-primary">{t("fin.openShift")}</button>
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
                  <form action={closeShift} className="mt-2 flex flex-wrap gap-2">
                    <input type="hidden" name="id" value={s.id} />
                    <input name="closingActual" placeholder={t("fin.closeBalance")} className="rounded-lg border border-[var(--border)] px-3 py-2 text-sm" />
                    <input name="comment" placeholder={t("fin.diffReason")} className="rounded-lg border border-[var(--border)] px-3 py-2 text-sm" />
                    <button className="ui-btn-secondary">{t("common.close")}</button>
                  </form>
                </li>
              );
            })
          )}
        </ul>
      </section>

      {canExpense || canTransfer ? (
        <section className="grid gap-2 lg:grid-cols-2">
          {canExpense ? (
            <form action={expenseAction} className="space-y-2 ui-card" data-tour="fin-expense">
              <h2 className="text-sm font-semibold">{t("fin.expense")}</h2>
              <IdempotencyField prefix="expense" />
              <select name="accountId" className="w-full rounded-lg border border-[var(--border)] px-3 py-2 text-sm">
                {accounts.map((a) => (
                  <option key={a.id} value={a.id}>
                    {n("cash", a.code, a.name)}
                  </option>
                ))}
              </select>
              <select name="categoryId" className="w-full rounded-lg border border-[var(--border)] px-3 py-2 text-sm">
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
              <input name="amount" placeholder={t("common.amount")} className="w-full rounded-lg border border-[var(--border)] px-3 py-2 text-sm" />
              <input name="comment" placeholder={t("common.comment")} className="w-full rounded-lg border border-[var(--border)] px-3 py-2 text-sm" />
              <PendingButton className="ui-btn-primary" pendingLabel={t("common.sending")}>
                {t("fin.postExpense")}
              </PendingButton>
            </form>
          ) : null}
          {canTransfer ? (
            <form action={transferAction} className="space-y-2 ui-card">
              <h2 className="text-sm font-semibold">{t("fin.transfer")}</h2>
              <select name="fromAccountId" className="w-full rounded-lg border border-[var(--border)] px-3 py-2 text-sm">
                {accounts.map((a) => (
                  <option key={a.id} value={a.id}>
                    {t("fin.from")}: {n("cash", a.code, a.name)}
                  </option>
                ))}
              </select>
              <select name="toAccountId" className="w-full rounded-lg border border-[var(--border)] px-3 py-2 text-sm">
                {accounts.map((a) => (
                  <option key={a.id} value={a.id}>
                    {t("fin.to")}: {n("cash", a.code, a.name)}
                  </option>
                ))}
              </select>
              <input name="amount" placeholder={t("common.amount")} className="w-full rounded-lg border border-[var(--border)] px-3 py-2 text-sm" />
              <input name="comment" placeholder={t("common.comment")} className="w-full rounded-lg border border-[var(--border)] px-3 py-2 text-sm" />
              <button className="ui-btn-primary">{t("fin.transferBtn")}</button>
            </form>
          ) : null}
        </section>
      ) : null}

      {canExpense ? (
        <section className="grid gap-2 lg:grid-cols-2">
          <form action={obligationAction} className="space-y-2 ui-card">
            <h2 className="text-sm font-semibold">{t("fin.obligation")}</h2>
            <input name="name" placeholder={t("common.name")} className="w-full rounded-lg border border-[var(--border)] px-3 py-2 text-sm" />
            <select name="kind" className="w-full rounded-lg border border-[var(--border)] px-3 py-2 text-sm">
              <option value="other">{t("fin.other")}</option>
              <option value="supplier">{t("common.supplier")}</option>
              <option value="tax">{t("fin.tax")}</option>
            </select>
            <input name="amount" placeholder={t("common.amount")} className="w-full rounded-lg border border-[var(--border)] px-3 py-2 text-sm" />
            <button className="ui-btn-primary">{t("common.add")}</button>
          </form>
          <form action={categoryAction} className="space-y-2 ui-card">
            <h2 className="text-sm font-semibold">{t("fin.expenseCat")}</h2>
            <input name="code" placeholder={t("common.code")} className="w-full rounded-lg border border-[var(--border)] px-3 py-2 text-sm" />
            <input name="name" placeholder={t("common.name")} className="w-full rounded-lg border border-[var(--border)] px-3 py-2 text-sm" />
            <select name="fundCode" className="w-full rounded-lg border border-[var(--border)] px-3 py-2 text-sm">
              {funds.map((f) => (
                <option key={f.code} value={f.code}>
                  {n("fund", f.code, f.name)}
                </option>
              ))}
            </select>
            <button className="ui-btn-primary">{t("fin.saveCat")}</button>
          </form>
        </section>
      ) : null}

      <section className="ui-card overflow-hidden">
        <h2 className="section-title">{t("fin.obligations")}</h2>
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
                  <DataListPrimary
                    title={o.supplier.name}
                    subtitle={`${t("fin.supplierOf")} · ${o.number}`}
                  />
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
      </section>

      <section className="overflow-hidden ui-card">
        <div className="border-b border-[var(--line)] px-5 py-3">
          <h2 className="text-sm font-semibold">{t("set.audit")}</h2>
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
      </section>
    </div>
  );
}

