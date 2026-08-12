import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/authz";
import { hasPermission } from "@/lib/authz";
import { D, moneyDisplay } from "@/lib/decimal";
import { cashDelta, fundDelta } from "@/lib/finance";
import { createExpense, createExpenseCategory, createObligation, transferCash } from "@/app/actions/finance";
import { closeCashShift, openCashShift } from "@/app/actions/control";

export default async function FinancePage() {
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
    <div className="space-y-6">
      <div>
        <p className="text-xs font-medium uppercase tracking-[0.16em] text-teal-800">PHASE 6</p>
        <h1 className="mt-1 text-2xl font-semibold">Финансы</h1>
        <p className="mt-1 text-sm text-slate-600">
          Баланс касс — где лежат деньги. Фонды — на что они уже предназначены. Не три физических кошелька.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <Stat label="Физически (кассы)" value={`${moneyDisplay(physical)} с`} />
        <Stat label="Распределено по фондам" value={`${moneyDisplay(allocated)} с`} />
        <Stat label="Долги поставщикам" value={`${moneyDisplay(supplierDebt.add(otherDebt))} с`} />
      </div>

      <section className="grid gap-4 lg:grid-cols-2">
        <div className="rounded-2xl border border-[var(--line)] bg-white p-5">
          <h2 className="text-sm font-semibold">Кассы</h2>
          <ul className="mt-3 space-y-2 text-sm">
            {cashBalances.map((a) => (
              <li key={a.id} className="flex justify-between">
                <span>{a.name}</span>
                <span className="font-mono text-xs">{moneyDisplay(a.balance)} с</span>
              </li>
            ))}
          </ul>
        </div>
        <div className="rounded-2xl border border-[var(--line)] bg-white p-5">
          <h2 className="text-sm font-semibold">Фонды</h2>
          <ul className="mt-3 space-y-2 text-sm">
            {fundBalances.map((f) => (
              <li key={f.id} className="flex justify-between">
                <span>{f.name}</span>
                <span className="font-mono text-xs">{moneyDisplay(f.balance)} с</span>
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section className="rounded-2xl border border-[var(--line)] bg-white p-5">
        <h2 className="text-sm font-semibold">Смена кассы</h2>
        <form action={openShift} className="mt-3 flex flex-wrap gap-2">
          <select name="accountId" className="rounded-lg border border-slate-200 px-3 py-2 text-sm">
            {accounts.map((a) => (
              <option key={a.id} value={a.id}>
                {a.name}
              </option>
            ))}
          </select>
          <input name="openingAmount" placeholder="Остаток на начало" className="rounded-lg border border-slate-200 px-3 py-2 text-sm" />
          <button className="rounded-lg bg-teal-800 px-3 py-2 text-sm text-white">Открыть смену</button>
        </form>
        <ul className="mt-3 space-y-3 text-sm">
          {shifts.length === 0 ? (
            <li className="text-slate-500">Открытых смен нет.</li>
          ) : (
            shifts.map((s) => {
              const acc = accounts.find((a) => a.id === s.accountId);
              const expected = cashBalances.find((a) => a.id === s.accountId)?.balance;
              return (
                <li key={s.id} className="rounded-lg border border-slate-100 p-3">
                  <p>
                    {acc?.name} · открыта {s.openedAt.toLocaleString("ru-RU")} · старт{" "}
                    {moneyDisplay(s.openingAmount)} с
                  </p>
                  <p className="text-xs text-slate-500">
                    Ожидаемый остаток сейчас: {expected ? moneyDisplay(expected) : "—"} с
                  </p>
                  <form action={closeShift} className="mt-2 flex flex-wrap gap-2">
                    <input type="hidden" name="id" value={s.id} />
                    <input name="closingActual" placeholder="Факт на конец" className="rounded-lg border border-slate-200 px-3 py-2 text-sm" />
                    <input name="comment" placeholder="Причина расхождения" className="rounded-lg border border-slate-200 px-3 py-2 text-sm" />
                    <button className="rounded-lg border border-slate-200 px-3 py-2 text-sm">Закрыть</button>
                  </form>
                </li>
              );
            })
          )}
        </ul>
      </section>

      {canExpense || canTransfer ? (
        <section className="grid gap-4 lg:grid-cols-2">
          {canExpense ? (
            <form action={expenseAction} className="space-y-2 rounded-2xl border border-[var(--line)] bg-white p-5">
              <h2 className="text-sm font-semibold">Расход</h2>
              <select name="accountId" className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm">
                {accounts.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.name}
                  </option>
                ))}
              </select>
              <select name="categoryId" className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm">
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
              <input name="amount" placeholder="Сумма" className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm" />
              <input name="comment" placeholder="Комментарий" className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm" />
              <button className="rounded-lg bg-teal-800 px-3 py-2 text-sm text-white">Провести расход</button>
            </form>
          ) : null}
          {canTransfer ? (
            <form action={transferAction} className="space-y-2 rounded-2xl border border-[var(--line)] bg-white p-5">
              <h2 className="text-sm font-semibold">Перевод между кассами</h2>
              <select name="fromAccountId" className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm">
                {accounts.map((a) => (
                  <option key={a.id} value={a.id}>
                    Из: {a.name}
                  </option>
                ))}
              </select>
              <select name="toAccountId" className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm">
                {accounts.map((a) => (
                  <option key={a.id} value={a.id}>
                    В: {a.name}
                  </option>
                ))}
              </select>
              <input name="amount" placeholder="Сумма" className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm" />
              <input name="comment" placeholder="Комментарий" className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm" />
              <button className="rounded-lg bg-teal-800 px-3 py-2 text-sm text-white">Перевести</button>
            </form>
          ) : null}
        </section>
      ) : null}

      {canExpense ? (
        <section className="grid gap-4 lg:grid-cols-2">
          <form action={obligationAction} className="space-y-2 rounded-2xl border border-[var(--line)] bg-white p-5">
            <h2 className="text-sm font-semibold">Обязательство</h2>
            <input name="name" placeholder="Название" className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm" />
            <select name="kind" className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm">
              <option value="other">Прочее</option>
              <option value="supplier">Поставщик</option>
              <option value="tax">Налог</option>
            </select>
            <input name="amount" placeholder="Сумма" className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm" />
            <button className="rounded-lg bg-teal-800 px-3 py-2 text-sm text-white">Добавить</button>
          </form>
          <form action={categoryAction} className="space-y-2 rounded-2xl border border-[var(--line)] bg-white p-5">
            <h2 className="text-sm font-semibold">Категория расхода</h2>
            <input name="code" placeholder="Код" className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm" />
            <input name="name" placeholder="Название" className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm" />
            <select name="fundCode" className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm">
              {funds.map((f) => (
                <option key={f.code} value={f.code}>
                  {f.name}
                </option>
              ))}
            </select>
            <button className="rounded-lg bg-teal-800 px-3 py-2 text-sm text-white">Сохранить категорию</button>
          </form>
        </section>
      ) : null}

      <section className="rounded-2xl border border-[var(--line)] bg-white p-5">
        <h2 className="text-sm font-semibold">Обязательства</h2>
        <ul className="mt-3 space-y-2 text-sm">
          {purchaseDebts
            .filter((o) => D(String(o.total)).sub(o.paidAmount).gt(0))
            .map((o) => (
              <li key={o.id} className="flex justify-between">
                <span>
                  Поставщик {o.supplier.name} · {o.number}
                </span>
                <span className="font-mono text-xs">{moneyDisplay(D(String(o.total)).sub(o.paidAmount))} с</span>
              </li>
            ))}
          {obligations.map((o) => (
            <li key={o.id} className="flex justify-between">
              <span>{o.name}</span>
              <span className="font-mono text-xs">{moneyDisplay(D(String(o.amount)).sub(o.paidAmount))} с</span>
            </li>
          ))}
        </ul>
      </section>

      <section className="overflow-hidden rounded-2xl border border-[var(--line)] bg-white">
        <div className="border-b border-[var(--line)] px-5 py-3">
          <h2 className="text-sm font-semibold">Журнал</h2>
        </div>
        <ul className="divide-y divide-slate-100">
          {entries.length === 0 ? (
            <li className="px-5 py-6 text-sm text-slate-500">Проводок нет.</li>
          ) : (
            entries.slice(0, 80).map((e) => (
              <li key={e.id} className="flex justify-between px-5 py-3 text-sm">
                <span>
                  {e.type} {e.comment ? `· ${e.comment}` : ""}
                </span>
                <span className="font-mono text-xs">
                  {moneyDisplay(e.amount)} с · {e.createdAt.toLocaleString("ru-RU")}
                </span>
              </li>
            ))
          )}
        </ul>
      </section>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-[var(--line)] bg-white p-5">
      <p className="text-xs text-slate-500">{label}</p>
      <p className="mt-2 text-2xl font-semibold">{value}</p>
    </div>
  );
}
