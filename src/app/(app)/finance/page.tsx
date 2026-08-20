import { getTranslator, intlLocale } from "@core/shared/i18n/locale";
import { prisma } from "@core/infrastructure/prisma";
import { requirePermission, hasPermission } from "@core/auth/authz";
import { D, moneyDisplay } from "@core/shared/decimal";
import { cashDelta, fundDelta, FUND } from "@core/finance/finance";
import { createExpense, createExpenseCategory, createObligation, postRecurringObligations, transferCash } from "@/app/actions/finance";
import { closeCashShift, openCashShift } from "@/app/actions/control";
import { RevealList } from "@/components/reveal-list";
import { IdempotencyField } from "@/components/idempotency-field";
import { PendingButton } from "@/components/pending-button";
import { FormField } from "@/components/form-field";
import { AppSelect } from "@/components/app-select";
import Link from "next/link";
import styles from "./finance.module.css";

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
    prisma.purchaseOrder.findMany({ where: { status: { not: "CANCELLED" } }, include: { supplier: true } }),
    prisma.cashShift.findMany({ where: { status: { in: ["OPEN", "PENDING_CLOSE"] } }, orderBy: { openedAt: "desc" } }),
  ]);

  const cashBalances = accounts.map((a) => ({ ...a, balance: entries.reduce((s, e) => s.add(cashDelta(e, a.id)), D(0)) }));
  const fundBalances = funds.map((f) => ({ ...f, balance: entries.reduce((s, e) => s.add(fundDelta(e, f.id)), D(0)) }));
  const physical = cashBalances.reduce((s, a) => s.add(a.balance), D(0));
  const allocated = fundBalances.reduce((s, f) => s.add(f.balance), D(0));
  const supplierDebt = purchaseDebts.reduce((s, o) => s.add(D(String(o.total)).sub(o.paidAmount)), D(0));
  const otherDebt = obligations.reduce((s, o) => s.add(D(String(o.amount)).sub(o.paidAmount)), D(0));

  async function expenseAction(formData: FormData) { "use server"; await createExpense(formData); }
  async function transferAction(formData: FormData) { "use server"; await transferCash(formData); }
  async function obligationAction(formData: FormData) { "use server"; await createObligation(formData); }
  async function recurringAction() { "use server"; await postRecurringObligations(); }
  async function categoryAction(formData: FormData) { "use server"; await createExpenseCategory(formData); }
  async function openShift(formData: FormData) { "use server"; await openCashShift(formData); }
  async function closeShift(formData: FormData) { "use server"; await closeCashShift(formData); }

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <div className={styles.headerText}>
          <h1 className={styles.title}>{t("page.finance")}</h1>
          <p className={styles.subtitle}>{t("fin.hint")}</p>
        </div>
        <div className={styles.headerActions}>
          <Link href="/finance/expenses" className={styles.ghostLink}>{t("nav.expenses")}</Link>
          <Link href="/finance/reports" className={styles.ghostLink}>{t("nav.reports")}</Link>
        </div>
      </header>

      {/* KPI strip */}
      <div className={styles.kpiStrip} data-tour="fin-money">
        <div className={styles.kpiBox}>
          <p className={styles.kpiLabel}>{t("fin.physical")}</p>
          <p className={styles.kpiValue}>{moneyDisplay(physical)} с</p>
          <p className={styles.kpiHint}>{t("home.period")}</p>
        </div>
        <div className={styles.kpiBox}>
          <p className={styles.kpiLabel}>{t("fin.byFunds")}</p>
          <p className={styles.kpiValue}>{moneyDisplay(allocated)} с</p>
        </div>
        <div className={styles.kpiBox}>
          <p className={styles.kpiLabel}>{t("fin.supplierDebt")}</p>
          <p className={supplierDebt.add(otherDebt).gt(0) ? styles.kpiValueBad : styles.kpiValue}>{moneyDisplay(supplierDebt.add(otherDebt))} с</p>
        </div>
      </div>

      {/* Accounts + Funds */}
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

      {/* Cash shift */}
      <section className={styles.section} data-tour="fin-shift">
        <div className={styles.sectionHead}>
          <h2 className={styles.sectionTitle}>{t("fin.shift")}</h2>
        </div>
        <div className={styles.sectionBody}>
          <form action={openShift} className="flex flex-wrap items-end gap-3 mb-4">
            <FormField label={t("fin.accounts")} className="min-w-[10rem] flex-1">
              <AppSelect
                name="accountId"
                defaultValue={accounts[0]?.id ?? ""}
                options={accounts.map((a) => ({ value: a.id, label: n("cash", a.code, a.name) }))}
              />
            </FormField>
            <FormField label={t("fin.openBalance")} className="min-w-[8rem]">
              <input name="openingAmount" placeholder={t("fin.openBalance")} className="ui-input" />
            </FormField>
            <button type="submit" className="ui-btn-primary min-h-[44px]">{t("fin.openShift")}</button>
          </form>
          {shifts.length === 0 ? (
            <p style={{ fontSize: 13, color: "var(--ink-3)" }}>{t("fin.noShifts")}</p>
          ) : (
            shifts.map((s) => {
              const acc = accounts.find((a) => a.id === s.accountId);
              const expected = cashBalances.find((a) => a.id === s.accountId)?.balance;
              return (
                <div key={s.id} className={styles.shiftCard}>
                  <p className={styles.shiftMeta}>{acc?.name} · {t("fin.openedAt")} {s.openedAt.toLocaleString(intlLocale(locale))} · {t("fin.start")} {moneyDisplay(s.openingAmount)} с</p>
                  <p className={styles.shiftHint}>{t("fin.expectedNow")}: {expected ? moneyDisplay(expected) : "—"} с</p>
                  <form action={closeShift} className="flex flex-wrap items-end gap-2">
                    <input type="hidden" name="id" value={s.id} />
                    <FormField label={t("fin.closeBalance")} className="min-w-[8rem]">
                      <input name="closingActual" placeholder={t("fin.closeBalance")} className="ui-input" />
                    </FormField>
                    <FormField label={t("fin.diffReason")} className="min-w-[10rem] flex-1">
                      <input name="comment" placeholder={t("fin.diffReason")} className="ui-input" />
                    </FormField>
                    <button type="submit" className="ui-btn-secondary min-h-[44px]">{t("common.close")}</button>
                  </form>
                </div>
              );
            })
          )}
        </div>
      </section>

      {/* Operations: Expense + Transfer */}
      {canExpense || canTransfer ? (
        <div className={styles.twoCol}>
          {canExpense ? (
            <section className={styles.section} data-tour="fin-expense">
              <div className={styles.sectionHead}>
                <h2 className={styles.sectionTitle}>{t("fin.expense")}</h2>
              </div>
              <div className={styles.sectionBody}>
                <form action={expenseAction} className="grid gap-3">
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
                    <input name="amount" placeholder={t("common.amount")} className="ui-input" inputMode="decimal" />
                  </FormField>
                  <FormField label={t("common.comment")}>
                    <input name="comment" placeholder={t("common.comment")} className="ui-input" />
                  </FormField>
                  <PendingButton className="ui-btn-primary min-h-[44px]" pendingLabel={t("common.sending")}>{t("fin.postExpense")}</PendingButton>
                </form>
              </div>
            </section>
          ) : null}
          {canTransfer ? (
            <section className={styles.section}>
              <div className={styles.sectionHead}>
                <h2 className={styles.sectionTitle}>{t("fin.transfer")}</h2>
              </div>
              <div className={styles.sectionBody}>
                <form action={transferAction} className="grid gap-3">
                  <FormField label={t("fin.from")}>
                    <AppSelect
                      name="fromAccountId"
                      defaultValue={accounts[0]?.id ?? ""}
                      options={accounts.map((a) => ({ value: a.id, label: n("cash", a.code, a.name) }))}
                    />
                  </FormField>
                  <FormField label={t("fin.to")}>
                    <AppSelect
                      name="toAccountId"
                      defaultValue={accounts[0]?.id ?? ""}
                      options={accounts.map((a) => ({ value: a.id, label: n("cash", a.code, a.name) }))}
                    />
                  </FormField>
                  <FormField label={`${t("common.amount")}, с`}>
                    <input name="amount" placeholder={t("common.amount")} className="ui-input" inputMode="decimal" />
                  </FormField>
                  <FormField label={t("common.comment")}>
                    <input name="comment" placeholder={t("common.comment")} className="ui-input" />
                  </FormField>
                  <button type="submit" className="ui-btn-primary min-h-[44px]">{t("fin.transferBtn")}</button>
                </form>
              </div>
            </section>
          ) : null}
        </div>
      ) : null}

      {/* Obligation + Category */}
      {canExpense ? (
        <div className={styles.twoCol}>
          <section className={styles.section}>
            <div className={styles.sectionHead}>
              <h2 className={styles.sectionTitle}>{t("fin.obligation")}</h2>
            </div>
            <div className={styles.sectionBody}>
              <form action={obligationAction} className="grid gap-3">
                <FormField label={t("common.name")}>
                  <input name="name" placeholder={t("common.name")} className="ui-input" />
                </FormField>
                <AppSelect
                  name="kind"
                  defaultValue="other"
                  aria-label={t("fin.obligation")}
                  options={[
                    { value: "other", label: t("fin.other") },
                    { value: "supplier", label: t("common.supplier") },
                    { value: "tax", label: t("fin.tax") },
                  ]}
                />
                <FormField label={`${t("common.amount")}, с`}>
                  <input name="amount" placeholder={t("common.amount")} className="ui-input" inputMode="decimal" />
                </FormField>
                <AppSelect
                  name="interval"
                  defaultValue=""
                  aria-label={t("fin.interval")}
                  placeholder={t("fin.oneOff")}
                  options={[
                    { value: "", label: t("fin.oneOff") },
                    { value: "MONTHLY", label: t("fin.monthly") },
                  ]}
                />
                <button type="submit" className="ui-btn-primary min-h-[44px]">{t("common.add")}</button>
              </form>
              <form action={recurringAction} className="mt-3">
                <button type="submit" className="ui-btn-secondary min-h-[44px]">{t("fin.postRecurring")}</button>
              </form>
            </div>
          </section>
          <section className={styles.section}>
            <div className={styles.sectionHead}>
              <h2 className={styles.sectionTitle}>{t("fin.expenseCat")}</h2>
            </div>
            <div className={styles.sectionBody}>
              <form action={categoryAction} className="grid gap-3">
                <FormField label={t("common.code")}>
                  <input name="code" placeholder={t("common.code")} className="ui-input" />
                </FormField>
                <FormField label={t("common.name")}>
                  <input name="name" placeholder={t("common.name")} className="ui-input" />
                </FormField>
                <FormField label={t("home.col.fund")}>
                  <AppSelect
                    name="fundCode"
                    defaultValue={funds[0]?.code ?? ""}
                    options={funds.map((f) => ({ value: f.code, label: n("fund", f.code, f.name) }))}
                  />
                </FormField>
                <button type="submit" className="ui-btn-primary min-h-[44px]">{t("fin.saveCat")}</button>
              </form>
            </div>
          </section>
        </div>
      ) : null}

      {/* Obligations list */}
      <section className={styles.section}>
        <div className={styles.sectionHead}>
          <h2 className={styles.sectionTitle}>{t("fin.obligations")}</h2>
        </div>
        {(() => {
          const debtItems = [
            ...purchaseDebts.filter((o) => D(String(o.total)).sub(o.paidAmount).gt(0)).map((o) => ({ id: o.id, name: o.supplier.name, sub: `${t("fin.supplierOf")} · ${o.number}`, amount: D(String(o.total)).sub(o.paidAmount) })),
            ...obligations.map((o) => ({ id: o.id, name: o.name, sub: undefined as string | undefined, amount: D(String(o.amount)).sub(o.paidAmount) })),
          ];
          if (debtItems.length === 0) return <div className={styles.empty}>{t("common.empty")}</div>;
          return (
            <>
              <div className={styles.tableWrap}>
                <table className={styles.table}>
                  <thead>
                    <tr>
                      <th>{t("list.col.what")}</th>
                      <th className={styles.thRight}>{t("common.debt")}</th>
                    </tr>
                  </thead>
                  <RevealList as="tbody" moreLabel={t("home.seeAll")} lessLabel={t("home.hide")} limit={8}>
                    {debtItems.map((item) => (
                      <tr key={item.id}>
                        <td>
                          <span className={styles.tdBold}>{item.name}</span>
                          {item.sub ? <p className={styles.tdMuted}>{item.sub}</p> : null}
                        </td>
                        <td className={`${styles.tdRight} ${styles.tdBad}`}>{moneyDisplay(item.amount)} с</td>
                      </tr>
                    ))}
                  </RevealList>
                </table>
              </div>
              <ul className={styles.mobileList}>
                {debtItems.map((item) => (
                  <li key={item.id} className={styles.mobileCard}>
                    <p className={styles.mobileName}>{item.name}</p>
                    {item.sub ? <p className={styles.mobileMeta}>{item.sub}</p> : null}
                    <p className={styles.mobileValueBad}>{moneyDisplay(item.amount)} с</p>
                  </li>
                ))}
              </ul>
            </>
          );
        })()}
      </section>

      {/* Ledger entries */}
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
