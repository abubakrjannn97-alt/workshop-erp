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
  Wallet,
  FileText,
} from "lucide-react";
import { prisma } from "@/lib/prisma";
import { requireSession } from "@/lib/authz";
import { D, moneyDisplay, qtyDisplay } from "@/lib/decimal";
import { FUND, fundDelta } from "@/lib/finance";
import { coverageAndPurchaseNeed, refreshOwnerAlerts } from "@/lib/alerts";
import { getTranslator, intlLocale } from "@/lib/locale";
import { StatisticsCards } from "@/components/dashboard/StatisticsCards";
import type { StatisticsCardData, StatisticsCardTrend } from "@/components/dashboard/StatisticsCards";
import { DashPanel } from "@/components/dash-panel";
import { FundRow } from "@/components/fund-row";
import { StatusBadge, orderTone } from "@/components/status-badge";
import { QuickAction } from "@/components/quick-action";
import { RevealList } from "@/components/reveal-list";
import { orderNo } from "@/lib/format";
import {
  DataList,
  DataListHead,
  DataListHeadCell,
  DataListMetric,
  DataListPrimary,
  DataListRow,
  dataListStyles,
} from "@/components/data-list";

const CARD_ICON = { size: 13, strokeWidth: 1.7, "aria-hidden": true } as const;

function moneyCard(value: { toString(): string }) {
  const [int, frac] = D(value).toDecimalPlaces(2).toFixed(2).split(".");
  const spaced = int.replace(/\B(?=(\d{3})+(?!\d))/g, " ");
  return `${spaced}.${frac} с`;
}

function cardTrend(
  now: { toString(): string },
  prev: { toString(): string },
  label: string,
): StatisticsCardTrend {
  const a = D(String(now));
  const b = D(String(prev));

  if (b.eq(0)) {
    if (a.eq(0)) {
      return { value: "0.0%", direction: "up", label };
    }
    return { value: "100%", direction: "up", label };
  }

  const pct = Number(a.sub(b).div(b).mul(100).toFixed(1));
  return {
    value: `${Math.abs(pct).toFixed(Math.abs(pct) >= 10 ? 0 : 1)}%`,
    direction: pct >= 0 ? "up" : "down",
    label,
  };
}

function orderDebt(o: { total: unknown; paidAmount: unknown }) {
  return D(String(o.total)).sub(o.paidAmount);
}

export async function DesktopHome() {
  await requireSession();
  const { t, n, locale } = await getTranslator();
  const monthStart = new Date();
  monthStart.setDate(1);
  monthStart.setHours(0, 0, 0, 0);
  const prevStart = new Date(monthStart);
  prevStart.setMonth(prevStart.getMonth() - 1);

  const [
    monthOrders,
    prevOrders,
    unpaid,
    overdue,
    lowMaterials,
    funds,
    entries,
    purchaseOrders,
    cover,
    recentOrders,
  ] = await Promise.all([
    prisma.order.findMany({
      where: { createdAt: { gte: monthStart }, status: { code: { not: "CANCELLED" } } },
      include: { payments: true },
    }),
    prisma.order.findMany({
      where: {
        createdAt: { gte: prevStart, lt: monthStart },
        status: { code: { not: "CANCELLED" } },
      },
      include: { payments: true },
    }),
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
    prisma.purchaseOrder.findMany({ where: { status: { not: "CANCELLED" } } }),
    coverageAndPurchaseNeed(),
    prisma.order.findMany({
      include: { customer: true, status: true },
      orderBy: { createdAt: "desc" },
      take: 20,
    }),
  ]);
  await refreshOwnerAlerts();

  const sold = monthOrders.reduce((s, o) => s.add(String(o.total)), D(0));
  const received = monthOrders.reduce(
    (s, o) => s.add(o.payments.reduce((p, pay) => p.add(String(pay.amount)), D(0))),
    D(0),
  );
  const prevSold = prevOrders.reduce((s, o) => s.add(String(o.total)), D(0));
  const prevReceived = prevOrders.reduce(
    (s, o) => s.add(o.payments.reduce((p, pay) => p.add(String(pay.amount)), D(0))),
    D(0),
  );
  const clientDebt = unpaid.reduce((s, o) => s.add(D(String(o.total)).sub(o.paidAmount)), D(0));
  const weOwe = purchaseOrders.reduce((s, o) => s.add(D(String(o.total)).sub(o.paidAmount)), D(0));
  const profitFund = funds.find((f) => f.code === FUND.PROFIT);
  const profit = profitFund
    ? entries.reduce((s, e) => s.add(fundDelta(e, profitFund.id)), D(0))
    : D(0);
  const profitThisMonth = profitFund
    ? entries
        .filter((e) => e.createdAt >= monthStart)
        .reduce((s, e) => s.add(fundDelta(e, profitFund.id)), D(0))
    : D(0);
  const profitPrevMonth = profitFund
    ? entries
        .filter((e) => e.createdAt >= prevStart && e.createdAt < monthStart)
        .reduce((s, e) => s.add(fundDelta(e, profitFund.id)), D(0))
    : D(0);
  const debtFromThisMonth = monthOrders.reduce((s, o) => {
    const due = orderDebt(o);
    return due.gt(0) ? s.add(due) : s;
  }, D(0));
  const debtFromPrevMonth = prevOrders.reduce((s, o) => {
    const due = orderDebt(o);
    return due.gt(0) ? s.add(due) : s;
  }, D(0));
  const fundBalances = funds.map((f) => ({
    ...f,
    balance: entries.reduce((s, e) => s.add(fundDelta(e, f.id)), D(0)),
  }));
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
    alerts.push({
      href: `/orders/${o.id}`,
      title: `${t("home.alert.overdue")} ${orderNo(o.number)}`,
      detail: o.customer.name,
      tone: "amber",
    });
  }
  for (const o of unpaid.filter((row) => D(String(row.total)).sub(row.paidAmount).gt(0)).slice(0, 4)) {
    const due = D(String(o.total)).sub(o.paidAmount);
    alerts.push({
      href: `/orders/${o.id}`,
      title: `${t("home.alert.debt")} ${orderNo(o.number)}`,
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
      tone: "blue",
    });
  }

  const vsPrev = t("home.vsPrev");
  const cards: StatisticsCardData[] = [
    {
      id: "sales",
      title: t("home.sold"),
      value: moneyCard(sold),
      subtitle: t("home.period"),
      accent: "gold",
      icon: <Wallet {...CARD_ICON} />,
      trend: cardTrend(sold, prevSold, vsPrev),
    },
    {
      id: "received",
      title: t("home.received"),
      value: moneyCard(received),
      subtitle: t("home.period"),
      accent: "gold",
      icon: <Wallet {...CARD_ICON} />,
      trend: cardTrend(received, prevReceived, vsPrev),
    },
    {
      id: "client-debt",
      title: t("home.clientDebt"),
      value: moneyCard(clientDebt),
      subtitle: `${t("home.weOwe")} ${moneyCard(weOwe)}`,
      accent: "red",
      icon: <FileText {...CARD_ICON} />,
      trend: cardTrend(debtFromThisMonth, debtFromPrevMonth, vsPrev),
    },
    {
      id: "withdrawable",
      title: t("home.withdrawable"),
      value: moneyCard(profit),
      subtitle: t("home.profitFund"),
      accent: "gold",
      icon: <Landmark {...CARD_ICON} />,
      trend: cardTrend(profitThisMonth, profitPrevMonth, vsPrev),
    },
  ];

  return (
    <div className="page-stack">
      <StatisticsCards cards={cards} />

      <div className="grid grid-cols-1 gap-2 lg:grid-cols-5" data-tour="home-work">
        <DashPanel title={t("home.funds")} icon={Landmark} className="lg:col-span-3">
          <DataList layout="cols2">
            <DataListHead layout="cols2">
              <DataListHeadCell>{t("home.col.fund")}</DataListHeadCell>
              <DataListHeadCell align="right">{t("home.col.balance")}</DataListHeadCell>
            </DataListHead>
            <ul className="ui-list">
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
          </DataList>
        </DashPanel>

        <DashPanel title={t("home.attention")} icon={Bell} className="lg:col-span-2">
          {alerts.length === 0 ? (
            <p className="text-[12px] text-[#98A2B3]">{t("home.noAlerts")}</p>
          ) : (
            <DataList layout="cols2">
              <DataListHead layout="cols2">
                <DataListHeadCell>{t("list.col.what")}</DataListHeadCell>
                <DataListHeadCell align="right">{t("list.col.sum")}</DataListHeadCell>
              </DataListHead>
              <RevealList moreLabel={t("home.seeAll")} lessLabel={t("home.hide")} limit={5} className={dataListStyles.rows}>
                {alerts.map((a, i) => (
                  <DataListRow key={`${a.href}-${i}`} layout="cols2">
                    <DataListPrimary title={a.title} subtitle={a.detail} href={a.href} />
                    {a.amount ? (
                      <DataListMetric
                        label={t("list.col.sum")}
                        value={a.amount}
                        tone={a.amountDanger ? "bad" : "default"}
                      />
                    ) : (
                      <DataListMetric label={t("list.col.sum")} value="—" tone="muted" />
                    )}
                  </DataListRow>
                ))}
              </RevealList>
            </DataList>
          )}
        </DashPanel>
      </div>

      <div className="grid grid-cols-1 gap-2 lg:grid-cols-5">
        <DashPanel
          title={t("home.recentOrders")}
          icon={ClipboardList}
          className="overflow-x-auto lg:col-span-3"
          action={
            <Link href="/orders?period=month" className="text-[11px] font-semibold text-[#667085] hover:text-[#101828]">
              {t("page.orders")} →
            </Link>
          }
        >
          {recentOrders.length === 0 ? (
            <p className="text-[13px] text-[#98A2B3]">{t("crm.noOrders")}</p>
          ) : (
            <table className="w-full min-w-[32rem] text-[13px]">
              <thead>
                <tr className="border-b border-[#EEF0F3] text-[11px] font-medium uppercase tracking-wide text-[#98A2B3]">
                  <th className="pb-2 text-left font-medium">{t("home.col.order")}</th>
                  <th className="pb-2 text-left font-medium">{t("home.col.customer")}</th>
                  <th className="pb-2 text-left font-medium">{t("home.col.date")}</th>
                  <th className="pb-2 text-right font-medium">{t("home.col.amount")}</th>
                  <th className="pb-2 text-left font-medium">{t("home.col.status")}</th>
                </tr>
              </thead>
              <RevealList
                as="tbody"
                moreLabel={t("home.seeAll")}
                lessLabel={t("home.hide")}
                limit={5}
                className="divide-y divide-[#EEF0F3]"
              >
                {recentOrders.map((o) => (
                  <tr key={o.id} className="h-8">
                    <td>
                      <Link href={`/orders/${o.id}`} className="font-medium text-[#101828] hover:underline">
                        {orderNo(o.number)}
                      </Link>
                    </td>
                    <td className="max-w-[10rem] truncate text-[#667085]">{o.customer.name}</td>
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

        <DashPanel title={t("home.quickActions")} icon={Zap} className="lg:col-span-2">
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
    </div>
  );
}
