import { prisma } from "@core/infrastructure/prisma";
import { D, moneyDisplay } from "@core/shared/decimal";
import { coverageAndPurchaseNeed, refreshOwnerAlerts } from "@core/inventory/alerts";
import { getTranslator, intlLocale } from "@core/shared/i18n/locale";
import {
  DashAttentionCounts,
  DashHero,
  DashQuickActionsMobile,
  DashRecentOrders,
  DashSection,
  ownerQuickActions,
} from "@/components/dashboard/dashboard-system";

function monthStart() {
  const d = new Date();
  d.setDate(1);
  d.setHours(0, 0, 0, 0);
  return d;
}

export async function OwnerHome() {
  const { t, n, locale } = await getTranslator();
  const start = monthStart();

  const [unpaid, overdue, lowMaterials, cover, recentOrders, monthOrders] = await Promise.all([
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
    coverageAndPurchaseNeed(),
    prisma.order.findMany({
      include: { customer: true, status: true },
      orderBy: { createdAt: "desc" },
      take: 5,
    }),
    prisma.order.findMany({
      where: { createdAt: { gte: start }, status: { code: { not: "CANCELLED" } } },
      include: { payments: true },
    }),
  ]);
  await refreshOwnerAlerts();

  const received = monthOrders.reduce(
    (s, o) => s.add(o.payments.reduce((p, pay) => p.add(String(pay.amount)), D(0))),
    D(0),
  );
  const unpaidDue = unpaid.filter((row) => D(String(row.total)).sub(String(row.paidAmount)).gt(0));
  const critical = lowMaterials.filter((m) => {
    const onHand = m.stockItems.reduce((s, i) => s.add(i.qtyOnHand), D(0));
    return onHand.lte(m.minStock);
  });
  const loc = intlLocale(locale);

  const attn = [
    overdue.length > 0
      ? { href: "/orders", label: t("home.attnOrders", { n: String(overdue.length) }) }
      : null,
    unpaidDue.length > 0
      ? { href: "/orders", label: t("home.attnPay", { n: String(unpaidDue.length) }) }
      : null,
    critical.length > 0
      ? { href: "/warehouse", label: t("home.attnStock", { n: String(critical.length) }) }
      : null,
    cover.purchaseNeed.length > 0
      ? { href: "/purchasing", label: t("home.attnBuy", { n: String(cover.purchaseNeed.length) }) }
      : null,
  ].filter((row): row is { href: string; label: string } => row !== null);

  return (
    <div className="page-stack">
      <DashHero
        tour="home-income"
        label={t("home.today")}
        value={`${moneyDisplay(received)} с`}
        hint={t("home.heroReceived")}
      />

      <DashSection title={t("home.attention")} tour="home-attention">
        <DashAttentionCounts rows={attn} empty={t("home.noAlerts")} />
      </DashSection>

      <DashSection title={t("home.quickActions")} tour="home-shortcuts">
        <DashQuickActionsMobile actions={ownerQuickActions(t)} />
      </DashSection>

      <DashSection title={t("home.recentOrders")} tour="home-orders">
        <DashRecentOrders orders={recentOrders} empty={t("crm.noOrders")} n={n} locale={loc} />
      </DashSection>
    </div>
  );
}
