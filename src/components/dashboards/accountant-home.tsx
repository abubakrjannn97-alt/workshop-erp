import { prisma } from "@/lib/prisma";
import { D, moneyDisplay } from "@core/shared/decimal";
import { FUND, fundDelta, LEDGER } from "@core/finance/finance";
import { getTranslator, intlLocale } from "@/lib/locale";
import { PageHeader } from "@/components/page-header";
import { KpiCard } from "@/components/kpi-card";
import { RevealList } from "@/components/reveal-list";

export async function AccountantHome() {
  const { t, n, locale } = await getTranslator();
  const start = new Date();
  start.setDate(1);
  start.setHours(0, 0, 0, 0);

  const [funds, entries, obligations, purchases] = await Promise.all([
    prisma.financialFund.findMany({ where: { code: { in: [FUND.MATERIALS, FUND.OPEX, FUND.PROFIT] } }, orderBy: { sortOrder: "asc" } }),
    prisma.ledgerEntry.findMany({ where: { status: "POSTED" } }),
    prisma.obligation.findMany({ where: { status: "OPEN" }, orderBy: { dueAt: "asc" } }),
    prisma.purchaseOrder.findMany({
      where: { status: { not: "CANCELLED" } },
      include: { supplier: true },
    }),
  ]);

  const fundBalances = funds.map((f) => ({
    ...f,
    balance: entries.reduce((s, e) => s.add(fundDelta(e, f.id)), D(0)),
  }));
  const monthExp = entries
    .filter((e) => e.type === LEDGER.CASH_OUT && e.createdAt >= start)
    .reduce((s, e) => s.add(String(e.amount)), D(0));
  const supplierDebt = purchases.reduce((s, o) => s.add(D(String(o.total)).sub(o.paidAmount)), D(0));

  return (
    <div className="page-stack">
      <PageHeader title={t("nav.home")} />
      <div className="grid gap-2 sm:grid-cols-2" data-tour="home-kpis">
        <KpiCard href="/finance/expenses" label={t("fin.monthExpenses")} value={`${moneyDisplay(monthExp)} с`} tone="out" />
        <KpiCard href="/finance" label={t("fin.supplierDebt")} value={`${moneyDisplay(supplierDebt)} с`} tone="out" />
      </div>
      <section className="ui-card" data-tour="home-work">
        <h2 className="text-sm font-semibold">{t("dash.threeFunds")}</h2>
        <ul className="mt-2 space-y-2 text-sm">
          {fundBalances.map((f) => (
            <li key={f.id} className="flex justify-between">
              <span>{n("fund", f.code, f.name)}</span>
              <span className="font-mono text-xs">{moneyDisplay(f.balance)} с</span>
            </li>
          ))}
        </ul>
      </section>
      <section className="ui-card">
        <h2 className="text-sm font-semibold">{t("dash.calendar")}</h2>
        {obligations.length === 0 ? (
          <p className="mt-2 text-sm text-[var(--muted)]">{t("common.empty")}</p>
        ) : (
          <RevealList moreLabel={t("home.seeAll")} lessLabel={t("home.hide")} limit={6}>
            {obligations.map((o) => (
              <li key={o.id} className="flex justify-between gap-2 text-sm">
                <span className="truncate">{o.name}</span>
                <span className="shrink-0 font-mono text-xs">
                  {moneyDisplay(D(String(o.amount)).sub(o.paidAmount))} с
                  {o.dueAt ? ` · ${o.dueAt.toLocaleDateString(intlLocale(locale))}` : ""}
                </span>
              </li>
            ))}
          </RevealList>
        )}
      </section>
      <section className="ui-card">
        <h2 className="text-sm font-semibold">{t("dash.openExp")}</h2>
        <ul className="mt-2 space-y-1 text-sm">
          {purchases
            .filter((o) => D(String(o.total)).sub(o.paidAmount).gt(0))
            .slice(0, 8)
            .map((o) => (
              <li key={o.id} className="flex justify-between gap-2">
                <span className="truncate">{o.supplier.name}</span>
                <span className="font-mono text-xs">{moneyDisplay(D(String(o.total)).sub(o.paidAmount))} с</span>
              </li>
            ))}
        </ul>
      </section>
    </div>
  );
}
