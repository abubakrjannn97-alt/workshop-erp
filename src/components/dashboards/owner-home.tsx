import Link from "next/link";
import {
  Landmark,
  Bell,
  Zap,
  ClipboardList,
  Users,
  Package,
  Factory,
  Truck,
  ChartColumn,
} from "lucide-react";
import { prisma } from "@core/infrastructure/prisma";
import { D, moneyDisplay, qtyDisplay } from "@core/shared/decimal";
import { FUND, fundDelta, LEDGER } from "@core/finance/finance";
import { coverageAndPurchaseNeed, refreshOwnerAlerts } from "@core/inventory/alerts";
import { getDomainConfig } from "@core/config/domain-config";
import { getTranslator, intlLocale } from "@core/shared/i18n/locale";
import { KpiCard } from "@/components/kpi-card";
import { DashPanel } from "@/components/dash-panel";
import { FundRow } from "@/components/fund-row";
import { StatusBadge, orderTone } from "@/components/status-badge";
import { QuickAction } from "@/components/quick-action";
import { RevealList } from "@/components/reveal-list";

function monthStart() {
  const d = new Date();
  d.setDate(1);
  d.setHours(0, 0, 0, 0);
  return d;
}

export async function OwnerHome() {
  const { t, n, locale } = await getTranslator();
  const start = monthStart();
  const domainConfig = await getDomainConfig();
  const outputUnit = await prisma.unit.findUnique({
    where: { code: domainConfig.product.defaultOutputUnit },
  });
  const outputUnitSymbol = outputUnit?.symbol ?? t("common.unitGeneric");

  const [
    unpaid,
    overdue,
    lowMaterials,
    funds,
    entries,
    cover,
    recentOrders,
    monthOrders,
    monthPays,
    monthProd,
  ] = await Promise.all([
    prisma.order.findMany({
      where: { paymentStatus: { in: ["unpaid", "partial"] }, status: { code: { not: "CANCELLED" } } },
      include: { customer: true },
      take: 20,
    }),
    prisma.order.findMany({
      where: {
        dueAt: { lt: new Date() },
        status: { code: { notIn: ["COMPLETED", "CANCELLED", "ISSUED"] } },
      },
      include: { customer: true, status: true },
      take: 20,
    }),
    prisma.material.findMany({
      where: { archivedAt: null, isActive: true },
      include: { storageUnit: true, stockItems: true },
    }),
    prisma.financialFund.findMany({ orderBy: { sortOrder: "asc" } }),
    prisma.ledgerEntry.findMany({ where: { status: "POSTED" }, orderBy: { createdAt: "desc" } }),
    coverageAndPurchaseNeed(),
    prisma.order.findMany({
      include: { customer: true, status: true },
      orderBy: { createdAt: "desc" },
      take: 20,
    }),
    prisma.order.findMany({
      where: { createdAt: { gte: start }, status: { code: { not: "CANCELLED" } } },
      select: { total: true },
    }),
    prisma.payment.aggregate({ where: { createdAt: { gte: start } }, _sum: { amount: true } }),
    prisma.productionBatch.aggregate({
      where: { status: "CLOSED", producedAt: { gte: start } },
      _sum: { actualQty: true },
    }),
  ]);
  await refreshOwnerAlerts();

  const fundBalances = funds.map((f) => ({
    ...f,
    balance: entries.reduce((s, e) => s.add(fundDelta(e, f.id)), D(0)),
  }));
  const sold = monthOrders.reduce((s, o) => s.add(String(o.total)), D(0));
  const paid = D(String(monthPays._sum.amount ?? 0));
  const produced = D(String(monthProd._sum.actualQty ?? 0));
  const expenses = entries
    .filter((e) => e.type === LEDGER.CASH_OUT && e.createdAt >= start)
    .reduce((s, e) => s.add(String(e.amount)), D(0));
  const profit = fundBalances.find((f) => f.code === FUND.PROFIT)?.balance ?? D(0);

  const critical = lowMaterials.filter((m) => {
    const onHand = m.stockItems.reduce((s, i) => s.add(i.qtyOnHand), D(0));
    return onHand.lte(m.minStock);
  });
  const loc = intlLocale(locale);

  type Alert = {
    href: string;
    title: string;
    detail?: string;
    tone: "rose" | "amber" | "blue";
    amount?: string;
    amountDanger?: boolean;
  };
  const alerts: Alert[] = [];
  for (const o of overdue.slice(0, 4)) {
    alerts.push({ href: `/orders/${o.id}`, title: t("home.alert.overdue"), detail: o.customer.name, tone: "rose" });
  }
  for (const o of unpaid.filter((row) => D(String(row.total)).sub(row.paidAmount).gt(0)).slice(0, 4)) {
    const due = D(String(o.total)).sub(o.paidAmount);
    alerts.push({
      href: `/orders/${o.id}`,
      title: t("home.alert.debt"),
      detail: o.customer.name,
      amount: `${moneyDisplay(due)} с`,
      amountDanger: true,
      tone: "rose",
    });
  }
  for (const m of critical.slice(0, 3)) {
    const onHand = m.stockItems.reduce((s, i) => s.add(i.qtyOnHand), D(0));
    alerts.push({
      href: "/warehouse",
      title: t("home.alert.stock"),
      detail: `${m.name} · ${qtyDisplay(onHand)} ${m.storageUnit.symbol}`,
      tone: "amber",
    });
  }
  if (cover.purchaseNeed.length > 0) {
    alerts.push({
      href: "/purchasing",
      title: t("home.alert.purchase"),
      detail: String(cover.purchaseNeed.length),
      tone: "amber",
    });
  }
  const dot: Record<Alert["tone"], string> = {
    rose: "bg-[#EF4444]",
    amber: "bg-amber-500",
    blue: "bg-[#3B82F6]",
  };

  return (
    <div className="page-stack">
      <DashPanel title={t("home.attention")} icon={Bell} tour="home-attention">
        {alerts.length === 0 ? (
          <p className="text-[12px] text-[#98A2B3]">{t("home.noAlerts")}</p>
        ) : (
          <RevealList moreLabel={t("home.seeAll")} lessLabel={t("home.hide")} limit={5}>
            {alerts.map((a, i) => (
              <li key={`${a.href}-${i}`}>
                <Link href={a.href} className="flex items-center gap-2 transition-colors hover:opacity-80">
                  <span className={`h-1.5 w-1.5 shrink-0 rounded-full ${dot[a.tone]}`} />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[12px] font-medium text-[#101828]">{a.title}</span>
                    {a.detail ? <span className="block truncate text-[11px] text-[#98A2B3]">{a.detail}</span> : null}
                  </span>
                  {a.amount ? (
                    <span className={`shrink-0 font-mono text-[12px] tabular-nums ${a.amountDanger ? "font-semibold text-[#EF4444]" : "text-[#101828]"}`}>
                      {a.amount}
                    </span>
                  ) : (
                    <span className="shrink-0 text-[#CBD5E1]">→</span>
                  )}
                </Link>
              </li>
            ))}
          </RevealList>
        )}
      </DashPanel>

      <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-5" data-tour="home-income">
        <KpiCard href="/sales" label={t("dash.todaySales")} value={`${moneyDisplay(sold)} с`} hint={t("home.period")} tone="in" />
        <KpiCard href="/sales" label={t("dash.todayPaid")} value={`${moneyDisplay(paid)} с`} hint={t("home.period")} tone="in" />
        <KpiCard href="/production" label={t("dash.todayProd")} value={`${qtyDisplay(produced)} ${outputUnitSymbol}`} hint={t("home.period")} tone="ink" />
        <KpiCard href="/finance/expenses" label={t("dash.todayExp")} value={`${moneyDisplay(expenses)} с`} hint={t("home.period")} tone="out" />
        <KpiCard href="/finance" label={t("dash.todayProfit")} value={`${moneyDisplay(profit)} с`} tone="in" />
      </div>

      <div className="grid grid-cols-1 items-start gap-2 lg:grid-cols-5">
        <DashPanel title={t("home.funds")} icon={Landmark} className="lg:col-span-3">
          <ul className="ui-list ui-fund-list">
            {fundBalances.map((f) => (
              <FundRow
                key={f.id}
                code={f.code}
                label={n("fund", f.code, f.name)}
                amount={`${moneyDisplay(f.balance)} с`}
                highlight={f.code === FUND.PROFIT}
              />
            ))}
          </ul>
        </DashPanel>

        <DashPanel title={t("home.quickActions")} icon={Zap} className="lg:col-span-2" tour="home-shortcuts">
          <div className="grid grid-cols-2 gap-2">
            <QuickAction href="/orders/new" label={t("sales.newOrder")} icon={ClipboardList} />
            <QuickAction href="/crm" label={t("nav.crm")} icon={Users} />
            <QuickAction href="/products" label={t("nav.products")} icon={Package} />
            <QuickAction href="/production" label={t("nav.production")} icon={Factory} />
            <QuickAction href="/purchasing" label={t("nav.purchasing")} icon={Truck} />
            <QuickAction href="/analytics" label={t("nav.analytics")} icon={ChartColumn} />
          </div>
        </DashPanel>
      </div>

      <DashPanel title={t("home.recentOrders")} icon={ClipboardList} className="overflow-x-auto" tour="home-orders">
        {recentOrders.length === 0 ? (
          <p className="text-[13px] text-[#98A2B3]">{t("crm.noOrders")}</p>
        ) : (
          <table className="w-full min-w-[32rem] text-[13px]">
            <thead>
              <tr className="border-b border-[#EEF0F3] text-[11px] font-medium uppercase tracking-wide text-[#98A2B3]">
                <th className="pb-2 text-left font-medium">{t("home.col.customer")}</th>
                <th className="pb-2 text-left font-medium">{t("home.col.date")}</th>
                <th className="pb-2 text-right font-medium">{t("home.col.amount")}</th>
                <th className="pb-2 text-left font-medium">{t("home.col.status")}</th>
              </tr>
            </thead>
            <RevealList as="tbody" moreLabel={t("home.seeAll")} lessLabel={t("home.hide")} limit={5} className="divide-y divide-[#EEF0F3]">
              {recentOrders.map((o) => (
                <tr key={o.id} className="h-8">
                  <td>
                    <Link href={`/orders/${o.id}`} className="font-medium text-[#101828] hover:underline">
                      {o.customer.name}
                    </Link>
                  </td>
                  <td className="whitespace-nowrap text-[#667085]">
                    {o.createdAt.toLocaleDateString(loc, { day: "2-digit", month: "2-digit", year: "2-digit" })}
                  </td>
                  <td className="text-right font-mono tabular-nums text-[#101828]">{moneyDisplay(o.total)} с</td>
                  <td>
                    <StatusBadge label={n("ostatus", o.status.code, o.status.name)} tone={orderTone(o.status.code)} />
                  </td>
                </tr>
              ))}
            </RevealList>
          </table>
        )}
      </DashPanel>
    </div>
  );
}
