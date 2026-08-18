import { prisma } from "@core/infrastructure/prisma";
import { D, moneyDisplay } from "@core/shared/decimal";
import { FUND, fundDelta } from "@core/finance/finance";
import { coverageAndPurchaseNeed, refreshOwnerAlerts } from "@core/inventory/alerts";
import { getTranslator, intlLocale } from "@core/shared/i18n/locale";
import { FundRow } from "@/components/fund-row";
import {
  buildOwnerDashAlerts,
  DashAlertList,
  DashMetricStrip,
  DashRecentOrders,
  DashSection,
} from "@/components/dashboard/dashboard-system";
import styles from "@/components/dashboard/dash-home.module.css";

function monthStart() {
  const d = new Date();
  d.setDate(1);
  d.setHours(0, 0, 0, 0);
  return d;
}

export async function OwnerHome() {
  const { t, n, locale } = await getTranslator();
  const start = monthStart();

  const [unpaid, overdue, lowMaterials, funds, entries, cover, recentOrders, monthOrders] = await Promise.all([
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
      take: 8,
    }),
    prisma.order.findMany({
      where: { createdAt: { gte: start }, status: { code: { not: "CANCELLED" } } },
      select: { total: true },
    }),
  ]);
  await refreshOwnerAlerts();

  const fundBalances = funds.map((f) => ({
    ...f,
    balance: entries.reduce((s, e) => s.add(fundDelta(e, f.id)), D(0)),
  }));
  const sold = monthOrders.reduce((s, o) => s.add(String(o.total)), D(0));
  const clientDebt = unpaid.reduce((s, o) => s.add(D(String(o.total)).sub(o.paidAmount)), D(0));
  const profit = fundBalances.find((f) => f.code === FUND.PROFIT)?.balance ?? D(0);

  const critical = lowMaterials.filter((m) => {
    const onHand = m.stockItems.reduce((s, i) => s.add(i.qtyOnHand), D(0));
    return onHand.lte(m.minStock);
  });
  const loc = intlLocale(locale);

  const alerts = buildOwnerDashAlerts({
    t,
    overdue,
    unpaid,
    criticalMaterials: critical,
    purchaseNeedCount: cover.purchaseNeed.length,
  });

  return (
    <div className="page-stack">
      <DashMetricStrip
        tour="home-income"
        metrics={[
          { id: "sales", label: t("home.sold"), value: `${moneyDisplay(sold)} с`, hint: t("home.period") },
          { id: "debt", label: t("home.needPay"), value: `${moneyDisplay(clientDebt)} с` },
          { id: "free", label: t("home.withdrawable"), value: `${moneyDisplay(profit)} с` },
        ]}
      />

      <DashSection title={t("home.attention")} tour="home-attention">
        <DashAlertList
          alerts={alerts}
          empty={t("home.noAlerts")}
          moreLabel={t("home.seeAll")}
          lessLabel={t("home.hide")}
          openLabel={t("home.open")}
        />
      </DashSection>

      <div className={styles.split}>
        <DashSection title={t("home.recentOrders")} tour="home-orders">
          <DashRecentOrders
            orders={recentOrders}
            empty={t("crm.noOrders")}
            moreLabel={t("home.seeAll")}
            lessLabel={t("home.hide")}
            t={t}
            n={n}
            locale={loc}
            variant="customer"
          />
        </DashSection>

        <DashSection title={t("home.funds")}>
          <ul>
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
        </DashSection>
      </div>
    </div>
  );
}
