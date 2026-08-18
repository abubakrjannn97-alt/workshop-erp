const fs = require("fs");
const path = require("path");

const root = path.join(__dirname, "..");

// i18n
const i18nPath = path.join(root, "src/lib/i18n.ts");
let i18n = fs.readFileSync(i18nPath, "utf8");
if (!i18n.includes('"home.recentOrders"')) {
  i18n = i18n.replace(
    '"home.quickActions": "Быстрые действия",',
    '"home.recentOrders": "Последние заказы",\n  "home.quickActions": "Быстрые действия",',
  );
  i18n = i18n.replace(
    '"home.col.order": "Заказ",',
    '"home.col.order": "Заказ",\n  "home.col.customer": "Клиент",\n  "home.col.date": "Дата",\n  "home.col.amount": "Сумма",',
  );
  i18n = i18n.replace(
    '"home.quickActions": "Амалиётҳои зуд",',
    '"home.recentOrders": "Фармоишҳои охирин",\n  "home.quickActions": "Амалиётҳои зуд",',
  );
  i18n = i18n.replace(
    '"home.col.order": "Фармоиш",',
    '"home.col.order": "Фармоиш",\n  "home.col.customer": "Мизоҷ",\n  "home.col.date": "Сана",\n  "home.col.amount": "Маблағ",',
  );
  fs.writeFileSync(i18nPath, i18n);
  console.log("i18n patched");
}

const pagePath = path.join(root, "src/app/(app)/page.tsx");
const page = `import Link from "next/link";
import {
  TrendingUp,
  Banknote,
  CircleAlert,
  Wallet,
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
import { prisma } from "@/lib/prisma";
import { requireSession } from "@core/auth/authz";
import { D, moneyDisplay, qtyDisplay } from "@/lib/decimal";
import { FUND, fundDelta } from "@core/finance/finance";
import { coverageAndPurchaseNeed, refreshOwnerAlerts } from "@core/inventory/alerts";
import { getTranslator, intlLocale } from "@/lib/locale";
import { KpiCard } from "@/components/kpi-card";
import { DashPanel } from "@/components/dash-panel";
import { FundRow } from "@/components/fund-row";
import { StatusBadge, orderTone } from "@/components/status-badge";
import { QuickAction } from "@/components/quick-action";
import { orderNo } from "@/lib/format";

function trendPct(now: { toString(): string }, prev: { toString(): string }): number | null {
  const a = D(String(now));
  const b = D(String(prev));
  if (b.eq(0)) return null;
  return Number(a.sub(b).div(b).mul(100).toFixed(1));
}

export default async function HomePage() {
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
      take: 6,
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
  const fundBalances = funds.map((f) => ({
    ...f,
    balance: entries.reduce((s, e) => s.add(fundDelta(e, f.id)), D(0)),
  }));
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
    alerts.push({
      href: \`/orders/\${o.id}\`,
      title: \`\${t("home.alert.overdue")} \${orderNo(o.number)}\`,
      detail: o.customer.name,
      tone: "amber",
    });
  }
  for (const o of unpaid.filter((row) => D(String(row.total)).sub(row.paidAmount).gt(0)).slice(0, 4)) {
    const due = D(String(o.total)).sub(o.paidAmount);
    alerts.push({
      href: \`/orders/\${o.id}\`,
      title: \`\${t("home.alert.debt")} \${orderNo(o.number)}\`,
      detail: o.customer.name,
      amount: \`\${moneyDisplay(due)} с\`,
      amountDanger: true,
      tone: "rose",
    });
  }
  for (const m of critical.slice(0, 3)) {
    const onHand = m.stockItems.reduce((s, i) => s.add(i.qtyOnHand), D(0));
    alerts.push({
      href: "/warehouse",
      title: t("home.alert.stock"),
      detail: \`\${m.name} · \${qtyDisplay(onHand)} \${m.storageUnit.symbol}\`,
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
  const shownAlerts = alerts.slice(0, 6);
  const dot: Record<Alert["tone"], string> = {
    rose: "bg-[#EF4444]",
    amber: "bg-amber-500",
    blue: "bg-[#3B82F6]",
  };

  return (
    <div className="page-stack">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4" data-tour="home-kpis">
        <KpiCard
          href="/analytics"
          label={t("home.sold")}
          value={\`\${moneyDisplay(sold)} с\`}
          hint={t("home.period")}
          trend={trendPct(sold, prevSold)}
          tone="in"
          icon={TrendingUp}
        />
        <KpiCard
          href="/sales"
          label={t("home.received")}
          value={\`\${moneyDisplay(received)} с\`}
          hint={t("home.period")}
          trend={trendPct(received, prevReceived)}
          tone="in"
          icon={Banknote}
        />
        <KpiCard
          href="/sales"
          label={t("home.clientDebt")}
          value={\`\${moneyDisplay(clientDebt)} с\`}
          hint={weOwe.gt(0) ? \`\${t("home.weOwe")} \${moneyDisplay(weOwe)} с\` : t("home.period")}
          tone="out"
          icon={CircleAlert}
        />
        <KpiCard
          href="/finance"
          label={t("home.withdrawable")}
          value={\`\${moneyDisplay(profit)} с\`}
          hint={t("home.profitFund")}
          tone="in"
          icon={Wallet}
        />
      </div>

      <div className="grid grid-cols-1 gap-3 lg:grid-cols-5" data-tour="home-work">
        <DashPanel title={t("home.funds")} icon={Landmark} className="lg:col-span-3">
          <ul className="space-y-0.5">
            {fundBalances.map((f) => (
              <FundRow
                key={f.id}
                code={f.code}
                label={n("fund", f.code, f.name)}
                amount={\`\${moneyDisplay(f.balance)} с\`}
                highlight={f.code === FUND.PROFIT}
              />
            ))}
          </ul>
        </DashPanel>

        <DashPanel title={t("home.attention")} icon={Bell} className="lg:col-span-2">
          {shownAlerts.length === 0 ? (
            <p className="text-[13px] text-[#98A2B3]">{t("home.noAlerts")}</p>
          ) : (
            <ul className="divide-y divide-[#EEF0F3]">
              {shownAlerts.map((a, i) => (
                <li key={\`\${a.href}-\${i}\`}>
                  <Link
                    href={a.href}
                    className="flex min-h-9 items-center gap-2.5 py-1.5 transition-colors hover:opacity-80"
                  >
                    <span className={\`h-2 w-2 shrink-0 rounded-full \${dot[a.tone]}\`} />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-[13px] font-medium text-[#101828]">{a.title}</span>
                      {a.detail ? (
                        <span className="block truncate text-[11px] text-[#98A2B3]">{a.detail}</span>
                      ) : null}
                    </span>
                    {a.amount ? (
                      <span
                        className={\`shrink-0 font-mono text-[12px] tabular-nums \${a.amountDanger ? "font-semibold text-[#EF4444]" : "text-[#101828]"}\`}
                      >
                        {a.amount}
                      </span>
                    ) : (
                      <span className="shrink-0 text-[#CBD5E1]">→</span>
                    )}
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </DashPanel>
      </div>

      <div className="grid grid-cols-1 gap-3 lg:grid-cols-5">
        <DashPanel title={t("home.recentOrders")} icon={ClipboardList} className="overflow-x-auto lg:col-span-3">
          {recentOrders.length === 0 ? (
            <p className="text-[13px] text-[#98A2B3]">{t("home.noDebts")}</p>
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
              <tbody className="divide-y divide-[#EEF0F3]">
                {recentOrders.map((o) => (
                  <tr key={o.id} className="h-9">
                    <td>
                      <Link href={\`/orders/\${o.id}\`} className="font-medium text-[#101828] hover:underline">
                        {orderNo(o.number)}
                      </Link>
                    </td>
                    <td className="max-w-[10rem] truncate text-[#667085]">{o.customer.name}</td>
                    <td className="whitespace-nowrap text-[#667085]">
                      {o.createdAt.toLocaleDateString(loc, { day: "2-digit", month: "2-digit", year: "2-digit" })}
                    </td>
                    <td className="text-right font-mono tabular-nums text-[#101828]">{moneyDisplay(o.total)} с</td>
                    <td>
                      <StatusBadge
                        label={n("ostatus", o.status.code, o.status.name)}
                        tone={orderTone(o.status.code)}
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
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
`;

fs.writeFileSync(pagePath, page);
console.log("page.tsx rewritten");
