import { Receipt, Wallet } from "lucide-react";
import { prisma } from "@core/infrastructure/prisma";
import { D, moneyDisplay } from "@core/shared/decimal";
import { FUND, fundDelta, LEDGER } from "@core/finance/finance";
import { getTranslator, intlLocale } from "@core/shared/i18n/locale";
import { PageHeader } from "@/components/page-header";
import { DashPanel } from "@/components/dash-panel";
import { DashMetricStrip } from "@/components/dashboard/dashboard-system";
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
      <DashMetricStrip
        variant="compact"
        tour="home-kpis"
        metrics={[
          {
            id: "expenses",
            tone: "orange",
            icon: Receipt,
            label: t("fin.monthExpenses"),
            value: `${moneyDisplay(monthExp)} с`,
            href: "/finance/expenses",
          },
          {
            id: "debt",
            tone: "blue",
            icon: Wallet,
            label: t("fin.supplierDebt"),
            value: `${moneyDisplay(supplierDebt)} с`,
            href: "/finance",
          },
        ]}
      />
      <DashPanel title={t("dash.threeFunds")} tour="home-work">
        <ul className="ui-list">
          {fundBalances.map((f) => (
            <li key={f.id} className="ui-list-row flex min-h-[44px] items-center justify-between text-sm">
              <span>{n("fund", f.code, f.name)}</span>
              <span className="font-mono text-xs tabular-nums">{moneyDisplay(f.balance)} с</span>
            </li>
          ))}
        </ul>
      </DashPanel>
      <DashPanel title={t("dash.calendar")}>
        {obligations.length === 0 ? (
          <p className="text-sm text-[var(--color-text-muted)]">{t("common.empty")}</p>
        ) : (
          <RevealList moreLabel={t("home.seeAll")} lessLabel={t("home.hide")} limit={6} className="ui-list">
            {obligations.map((o) => (
              <li key={o.id} className="ui-list-row flex min-h-[44px] items-center justify-between gap-2 text-sm">
                <span className="truncate">{o.name}</span>
                <span className="shrink-0 font-mono text-xs tabular-nums">
                  {moneyDisplay(D(String(o.amount)).sub(o.paidAmount))} с
                  {o.dueAt ? ` · ${o.dueAt.toLocaleDateString(intlLocale(locale))}` : ""}
                </span>
              </li>
            ))}
          </RevealList>
        )}
      </DashPanel>
      <DashPanel title={t("dash.openExp")}>
        <ul className="ui-list">
          {purchases
            .filter((o) => D(String(o.total)).sub(o.paidAmount).gt(0))
            .slice(0, 8)
            .map((o) => (
              <li key={o.id} className="ui-list-row flex min-h-[44px] items-center justify-between gap-2 text-sm">
                <span className="truncate">{o.supplier.name}</span>
                <span className="font-mono text-xs tabular-nums">{moneyDisplay(D(String(o.total)).sub(o.paidAmount))} с</span>
              </li>
            ))}
        </ul>
      </DashPanel>
    </div>
  );
}
