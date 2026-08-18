import Link from "next/link";
import { Suspense } from "react";
import {
  Wallet,
  ShoppingCart,
  ArrowDownToLine,
  FileText,
  BarChart3,
  ClipboardList,
  Users,
  Package,
  TrendingUp,
  MoreHorizontal,
  Bell,
  ChevronRight,
} from "lucide-react";
import { prisma } from "@/lib/prisma";
import { requireSession } from "@core/auth/authz";
import { D, qtyDisplay } from "@core/shared/decimal";
import { FUND, fundDelta } from "@core/finance/finance";
import { coverageAndPurchaseNeed, refreshOwnerAlerts } from "@core/inventory/alerts";
import { getTranslator, intlLocale } from "@/lib/locale";
import { orderNo } from "@core/shared/format";
import { CURRENCY_SYMBOL } from "@/lib/settings";
import { orderTone } from "@/components/status-badge";
import { FinancePeriodPicker } from "@/components/finance-period-picker";
import {
  financePeriodCompareHint,
  resolveFinanceDateRange,
  type FinancePeriod,
} from "@core/shared/order-period";
import styles from "./mobile-owner-home.module.css";

export type FinanceOverview = {
  period: FinancePeriod;
  income: number;
  incomeChangePct: number;
  sparkline: number[];
  stats: {
    sales: { amount: number; changePct: number };
    received: { amount: number; changePct: number };
    debts: { amount: number; changePct: number };
    free: { amount: number; changePct: number };
  };
};

export type OrderRow = {
  id: string;
  number: string;
  client: string;
  date: string;
  amount: number;
  statusCode: string;
  statusLabel: string;
};

export type AttentionItem = {
  id: string;
  href: string;
  title: string;
  subtitle?: string;
  amount?: number;
  severity: "critical" | "warning";
};

function moneyParts(value: number | { toString(): string }) {
  const n = D(value).toDecimalPlaces(0).toFixed(0);
  return n.replace(/\B(?=(\d{3})+(?!\d))/g, " ");
}

function moneyInt(value: number | { toString(): string }) {
  return `${moneyParts(value)} ${CURRENCY_SYMBOL}`;
}

function pctOf(now: { toString(): string }, prev: { toString(): string }) {
  const a = D(String(now));
  const b = D(String(prev));
  if (b.eq(0)) {
    if (a.eq(0)) return 0;
    return 100;
  }
  return Number(a.sub(b).div(b).mul(100).toFixed(1));
}

function formatPct(pct: number) {
  const abs = Math.abs(pct).toFixed(Math.abs(pct) >= 10 ? 0 : 1);
  return `${pct >= 0 ? "↑" : "↓"} ${abs}%`;
}

function sparkLine(values: number[]) {
  const w = 140;
  const h = 68;
  const pts =
    values.length === 0 || values.every((v) => v === 0)
      ? [
          { x: 0, y: 48 },
          { x: 28, y: 40 },
          { x: 56, y: 36 },
          { x: 84, y: 22 },
          { x: 112, y: 18 },
          { x: 140, y: 10 },
        ]
      : (() => {
          const max = Math.max(...values, 1);
          const min = Math.min(...values, 0);
          const span = Math.max(max - min, 1);
          return values.map((v, i) => ({
            x: values.length === 1 ? w / 2 : (i / (values.length - 1)) * w,
            y: 56 - ((v - min) / span) * 44,
          }));
        })();
  const last = pts[pts.length - 1] ?? { x: w, y: 10 };
  return {
    points: pts.map((p) => `${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(" "),
    fill: `M ${pts[0].x.toFixed(1)},${pts[0].y.toFixed(1)} ${pts
      .slice(1)
      .map((p) => `L ${p.x.toFixed(1)},${p.y.toFixed(1)}`)
      .join(" ")} L ${last.x.toFixed(1)},${h} L 0,${h} Z`,
    last,
  };
}

function badgeStyle(code: string) {
  const tone = orderTone(code);
  if (tone === "warn") return { color: "var(--accent-500)", background: "var(--accent-100)" };
  if (tone === "info") return { color: "var(--info-500)", background: "var(--info-100)" };
  return { color: "var(--text-500)", background: "var(--bg-card-border)" };
}

function orderDot(code: string) {
  if (code === "NEW") return "var(--accent-500)";
  if (code === "CONFIRMED" || code === "IN_PRODUCTION") return "var(--info-500)";
  return "var(--text-400)";
}

export async function MobileOwnerHome({ financePeriod }: { financePeriod?: string }) {
  await requireSession();
  const { t, n, locale } = await getTranslator();
  const range = resolveFinanceDateRange(financePeriod);
  const weekStart = new Date();
  weekStart.setDate(weekStart.getDate() - 6);
  weekStart.setHours(0, 0, 0, 0);

  const periodWhere =
    range.from && range.to
      ? { createdAt: { gte: range.from, lte: range.to } }
      : range.from
        ? { createdAt: { gte: range.from } }
        : {};
  const prevWhere =
    range.prevFrom && range.prevTo
      ? { createdAt: { gte: range.prevFrom, lte: range.prevTo } }
      : {};

  const [
    periodOrders,
    prevOrders,
    unpaid,
    overdue,
    lowMaterials,
    funds,
    entries,
    cover,
    recentOrders,
  ] = await Promise.all([
    prisma.order.findMany({
      where: { ...periodWhere, status: { code: { not: "CANCELLED" } } },
      include: { payments: true },
    }),
    range.prevFrom
      ? prisma.order.findMany({
          where: { ...prevWhere, status: { code: { not: "CANCELLED" } } },
          include: { payments: true },
        })
      : Promise.resolve([]),
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
      take: 8,
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
      take: 3,
    }),
  ]);
  await refreshOwnerAlerts();

  const sold = periodOrders.reduce((s, o) => s.add(String(o.total)), D(0));
  const received = periodOrders.reduce(
    (s, o) => s.add(o.payments.reduce((p, pay) => p.add(String(pay.amount)), D(0))),
    D(0),
  );
  const prevSold = prevOrders.reduce((s, o) => s.add(String(o.total)), D(0));
  const prevReceived = prevOrders.reduce(
    (s, o) => s.add(o.payments.reduce((p, pay) => p.add(String(pay.amount)), D(0))),
    D(0),
  );
  const clientDebt = unpaid.reduce((s, o) => s.add(D(String(o.total)).sub(o.paidAmount)), D(0));
  const profitFund = funds.find((f) => f.code === FUND.PROFIT);
  const profit = profitFund
    ? entries.reduce((s, e) => s.add(fundDelta(e, profitFund.id)), D(0))
    : D(0);
  const profitInPeriod = profitFund
    ? entries
        .filter((e) => {
          if (range.period === "all") return true;
          if (!range.from) return true;
          const afterFrom = e.createdAt >= range.from;
          const beforeTo = range.to ? e.createdAt <= range.to : true;
          return afterFrom && beforeTo;
        })
        .reduce((s, e) => s.add(fundDelta(e, profitFund.id)), D(0))
    : D(0);
  const profitPrevPeriod = profitFund
    ? entries
        .filter((e) => {
          if (!range.prevFrom || !range.prevTo) return false;
          return e.createdAt >= range.prevFrom && e.createdAt <= range.prevTo;
        })
        .reduce((s, e) => s.add(fundDelta(e, profitFund.id)), D(0))
    : D(0);
  const debtNow = periodOrders.reduce((s, o) => {
    const due = D(String(o.total)).sub(o.paidAmount);
    return due.gt(0) ? s.add(due) : s;
  }, D(0));
  const debtPrev = prevOrders.reduce((s, o) => {
    const due = D(String(o.total)).sub(o.paidAmount);
    return due.gt(0) ? s.add(due) : s;
  }, D(0));

  const days = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(weekStart);
    d.setDate(weekStart.getDate() + i);
    return d.toISOString().slice(0, 10);
  });
  const byDay = new Map(days.map((d) => [d, 0]));
  for (const o of periodOrders) {
    const key = o.createdAt.toISOString().slice(0, 10);
    if (byDay.has(key)) byDay.set(key, (byDay.get(key) ?? 0) + Number(o.total));
  }

  const overview: FinanceOverview = {
    period: range.period,
    income: Number(sold),
    incomeChangePct: range.prevFrom ? pctOf(sold, prevSold) : 0,
    sparkline: days.map((d) => byDay.get(d) ?? 0),
    stats: {
      sales: { amount: Number(sold), changePct: range.prevFrom ? pctOf(sold, prevSold) : 0 },
      received: { amount: Number(received), changePct: range.prevFrom ? pctOf(received, prevReceived) : 0 },
      debts: { amount: Number(clientDebt), changePct: range.prevFrom ? pctOf(debtNow, debtPrev) : 0 },
      free: { amount: Number(profit), changePct: range.prevFrom ? pctOf(profitInPeriod, profitPrevPeriod) : 0 },
    },
  };
  const spark = sparkLine(overview.sparkline);

  const critical = lowMaterials.filter((m) => {
    const onHand = m.stockItems.reduce((s, i) => s.add(i.qtyOnHand), D(0));
    return onHand.lte(m.minStock);
  });
  const loc = intlLocale(locale);

  const alerts: AttentionItem[] = [];
  for (const o of unpaid.filter((row) => D(String(row.total)).sub(row.paidAmount).gt(0)).slice(0, 2)) {
    alerts.push({
      id: `debt-${o.id}`,
      href: `/orders/${o.id}`,
      title: `${t("home.alert.debt")} ${o.customer.name}`,
      severity: "critical",
      amount: Number(D(String(o.total)).sub(o.paidAmount)),
    });
  }
  for (const o of overdue.slice(0, 1)) {
    alerts.push({
      id: `overdue-${o.id}`,
      href: `/orders/${o.id}`,
      title: t("home.alert.overdue"),
      subtitle: o.customer.name,
      severity: "warning",
    });
  }
  for (const m of critical.slice(0, 1)) {
    const onHand = m.stockItems.reduce((s, i) => s.add(i.qtyOnHand), D(0));
    alerts.push({
      id: `stock-${m.id}`,
      href: "/warehouse",
      title: t("home.alert.stock"),
      subtitle: `${m.name} · ${qtyDisplay(onHand)} ${m.storageUnit.symbol}`,
      severity: "warning",
    });
  }
  if (cover.purchaseNeed.length > 0 && alerts.length < 3) {
    alerts.push({
      id: "purchase",
      href: "/purchasing",
      title: t("home.alert.purchase"),
      subtitle: t("home.positions", { n: String(cover.purchaseNeed.length) }),
      severity: "warning",
    });
  }

  const orders: OrderRow[] = recentOrders.map((o) => ({
    id: o.id,
    number: orderNo(o.number),
    client: o.customer.name,
    date: o.createdAt.toLocaleDateString(loc, { day: "2-digit", month: "2-digit", year: "2-digit" }),
    amount: Number(o.total),
    statusCode: o.status.code,
    statusLabel: n("ostatus", o.status.code, o.status.name),
  }));

  const shortcuts = [
    { href: "/orders/new", label: t("sales.newOrder"), icon: ShoppingCart, glow: styles.iconGold },
    { href: "/crm", label: t("nav.crm"), icon: Users, glow: styles.iconGreen },
    { href: "/products", label: t("nav.products"), icon: Package, glow: styles.iconBlue },
    { href: "/production", label: t("nav.production"), icon: TrendingUp, glow: styles.iconPurple },
    { href: "/more", label: t("home.more"), icon: MoreHorizontal, glow: styles.iconGray },
  ] as const;

  const tiles = [
    {
      key: "sales",
      label: t("home.sold"),
      icon: ShoppingCart,
      color: "var(--success-500)",
      bg: "var(--success-100)",
      amount: overview.stats.sales.amount,
      pct: overview.stats.sales.changePct,
      danger: false,
    },
    {
      key: "received",
      label: t("home.received"),
      icon: ArrowDownToLine,
      color: "var(--info-500)",
      bg: "var(--info-100)",
      amount: overview.stats.received.amount,
      pct: overview.stats.received.changePct,
      danger: false,
    },
    {
      key: "debts",
      label: t("home.debtsShort"),
      icon: FileText,
      color: "var(--danger-500)",
      bg: "var(--danger-100)",
      amount: overview.stats.debts.amount,
      pct: overview.stats.debts.changePct,
      danger: true,
    },
    {
      key: "free",
      label: t("home.freeShort"),
      icon: BarChart3,
      color: "var(--accent-500)",
      bg: "var(--accent-100)",
      amount: overview.stats.free.amount,
      pct: overview.stats.free.changePct,
      danger: false,
    },
  ] as const;

  return (
    <div className={styles.page}>
      <div className={styles.reportRow}>
        <div>
          <h1 className={styles.reportTitle}>{t("home.reportDay")}</h1>
          <p className={styles.reportHint}>
            {new Date().toLocaleDateString(loc, { day: "numeric", month: "long" })}
            {" · "}
            {t("home.reportHint")}
          </p>
        </div>
        <span className={styles.live} aria-label={t("home.liveBadge")}>
          <span className={styles.liveDot} />
          {t("home.liveBadge")}
        </span>
      </div>

      <div className={styles.card} data-tour="home-income">
        <div className={styles.cardFx} aria-hidden />
        <div className={styles.cardInner}>
          <div className={styles.cardTop}>
            <p className={styles.cardTitle}>
              <span className={styles.wallet}>
                <Wallet size={14} strokeWidth={1.8} />
              </span>
              {t("home.financeOverview")}
            </p>
            <Suspense
              fallback={
                <span className={styles.period}>{t("home.periodMonth")}</span>
              }
            >
              <FinancePeriodPicker locale={locale} current={range.period} />
            </Suspense>
          </div>

          <div className={styles.incomeRow}>
            <p className={styles.incomeLabel}>{t("home.income")}</p>
            <p className={styles.incomeValue}>
              <span className={styles.incomeNum}>{moneyParts(overview.income)}</span>
              <span className={styles.incomeCur}>{CURRENCY_SYMBOL}</span>
              <span className={`${styles.pill} ${overview.incomeChangePct >= 0 ? "" : styles.pillDown}`}>
                {formatPct(overview.incomeChangePct)}
              </span>
            </p>
            <span className={styles.incomeHint}>{financePeriodCompareHint(range.period, t)}</span>
            <svg className={styles.spark} viewBox="0 0 140 68" aria-hidden>
              <defs>
                <linearGradient id="sparkFill" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#F5D56A" stopOpacity="0.32" />
                  <stop offset="100%" stopColor="#F5D56A" stopOpacity="0" />
                </linearGradient>
              </defs>
              <path d={spark.fill} fill="url(#sparkFill)" />
              <polyline
                points={spark.points}
                fill="none"
                stroke="#F5D56A"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              <circle className={styles.sparkDot} cx={spark.last.x} cy={spark.last.y} r="3" fill="#F5D56A" />
            </svg>
          </div>

          <div className={styles.tiles} data-tour="home-kpis">
            {tiles.map((tile) => {
              const Icon = tile.icon;
              return (
                <div key={tile.key} className={styles.tile}>
                  <span className={styles.tileIcon} style={{ background: tile.bg }}>
                    <Icon size={12} color={tile.color} strokeWidth={1.8} />
                  </span>
                  <p className={styles.tileLabel}>{tile.label}</p>
                  <p className={styles.tileValue}>{moneyInt(tile.amount)}</p>
                  <p className={`${styles.tileTrend} ${tile.danger || tile.pct < 0 ? styles.tileTrendDown : ""}`}>
                    {formatPct(tile.pct)}
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      <div className={styles.shortcutStrip} data-tour="home-shortcuts">
        <div className={`${styles.shortcuts} no-scrollbar snap-x`}>
          {shortcuts.map((item) => {
            const Icon = item.icon;
            return (
              <Link key={item.href} href={item.href} className={`${styles.shortcut} snap-start`}>
                <span className={`${styles.shortcutIcon} ${item.glow}`}>
                  <Icon size={20} strokeWidth={2.2} />
                </span>
                <span className={styles.shortcutLabel}>{item.label}</span>
              </Link>
            );
          })}
        </div>
      </div>

      <div className="mx-5 mt-5 space-y-5" data-tour="home-work">
        <section className={styles.lightCard} data-tour="home-orders">
          <div className={styles.sectionHead}>
            <h2 className={styles.sectionTitle}>
              <ClipboardList size={13} strokeWidth={1.8} />
              {t("home.recentOrders")}
            </h2>
            <Link href="/orders?period=all" className={styles.sectionLink}>
              {t("home.allOrders")} →
            </Link>
          </div>
          {orders.length === 0 ? (
            <p className="py-3 text-sm text-[var(--text-500)]">{t("crm.noOrders")}</p>
          ) : (
            <ul className={styles.listCards}>
              {orders.map((o) => (
                <li key={o.id}>
                  <Link href={`/orders/${o.id}`} className={styles.listRow}>
                    <span className="h-2 w-2 shrink-0 rounded-full" style={{ background: orderDot(o.statusCode) }} />
                    <span className="min-w-0 flex-1">
                      <span className={styles.neonTitle}>{o.number}</span>
                      <span className={styles.neonSub}>{o.client}</span>
                    </span>
                    <span className="hidden shrink-0 text-[11px] text-[var(--text-500)] min-[360px]:block">
                      {o.date}
                    </span>
                    <span className="shrink-0 text-[13px] font-bold text-[var(--text-900)] [font-variant-numeric:tabular-nums]">
                      {moneyInt(o.amount)}
                    </span>
                    <span
                      className="max-w-[5rem] shrink-0 truncate rounded-full px-2 py-0.5 text-[11px] font-semibold"
                      style={badgeStyle(o.statusCode)}
                    >
                      {o.statusLabel}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className={styles.lightCard} data-tour="home-attention">
          <div className={styles.sectionHead}>
            <h2 className={styles.sectionTitle}>
              <Bell size={13} strokeWidth={1.8} color="var(--accent-500)" />
              {t("home.attention")}
            </h2>
            <Link href="/orders?period=month" className={styles.sectionLink}>
              {t("home.seeAllArrow")} →
            </Link>
          </div>
          {alerts.length === 0 ? (
            <p className="py-3 text-sm text-[var(--text-500)]">{t("home.noAlerts")}</p>
          ) : (
            <ul className={styles.listCards}>
              {alerts.map((a) => (
                <li key={a.id}>
                  <Link href={a.href} className={styles.listRow}>
                    <span
                      className="mt-0.5 h-2 w-2 shrink-0 rounded-full"
                      style={{ background: a.severity === "critical" ? "var(--danger-500)" : "var(--accent-500)" }}
                    />
                    <span className="min-w-0 flex-1">
                      <span className={styles.neonTitle}>{a.title}</span>
                      {a.subtitle ? <span className={styles.neonSub}>{a.subtitle}</span> : null}
                    </span>
                    {a.amount != null ? (
                      <span className="shrink-0 text-[13px] font-bold text-[var(--danger-500)] [font-variant-numeric:tabular-nums]">
                        {moneyInt(a.amount)}
                      </span>
                    ) : null}
                    <ChevronRight size={16} className="shrink-0 text-[var(--text-400)]" />
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </div>
  );
}
