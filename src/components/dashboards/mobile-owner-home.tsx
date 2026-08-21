import { ShoppingBag, Package, Layers } from "lucide-react";
import { prisma } from "@core/infrastructure/prisma";
import { requireSession } from "@core/auth/authz";
import { getTranslator, intlLocale } from "@core/shared/i18n/locale";
import {
  DashGreeting,
  DashMetricStrip,
  DashQuickActions,
  DashRecentOrders,
  DashRecentOrdersFooterLink,
  DashSection,
  ownerMobileQuickActions,
} from "@/components/dashboard/dashboard-system";
import {
  fetchOwnerOperationalKpis,
  formatFgQty,
  formatSalesMoney,
} from "@/components/dashboard/owner-kpi-data";
import styles from "@/components/dashboard/dash-home.module.css";

export async function MobileOwnerHome() {
  await requireSession();
  const { t, n, locale } = await getTranslator();
  const loc = intlLocale(locale);

  const [kpis, recentOrders] = await Promise.all([
    fetchOwnerOperationalKpis(),
    prisma.order.findMany({
      include: {
        customer: true,
        status: true,
        items: { include: { product: true }, orderBy: { id: "asc" }, take: 2 },
      },
      orderBy: { createdAt: "desc" },
      take: 5,
    }),
  ]);

  let producedHint = t("home.kpi.noChangeToday");
  let producedHintTone: "positive" | "negative" | "neutral" = "neutral";
  if (kpis.producedChangePct !== null && kpis.producedChangePct > 0) {
    producedHint = t("home.kpi.vsYesterdayUp").replace("{pct}", String(kpis.producedChangePct));
    producedHintTone = "positive";
  } else if (kpis.producedChangePct !== null && kpis.producedChangePct < 0) {
    producedHint = t("home.kpi.vsYesterdayDown").replace("{pct}", String(Math.abs(kpis.producedChangePct)));
    producedHintTone = "negative";
  }

  return (
    <div className={`${styles.home} ${styles.homeMobile}`}>
      <DashGreeting t={t} mobile />

      <DashMetricStrip
        variant="compact"
        tour="home-income"
        metrics={[
          {
            id: "sales",
            tone: "orange",
            icon: ShoppingBag,
            featured: true,
            label: t("home.kpi.salesToday"),
            value: `${formatSalesMoney(kpis.salesToday)} с`,
            hint:
              kpis.salesTodayCount > 0
                ? t("home.kpi.salesTodayCount").replace("{n}", String(kpis.salesTodayCount))
                : t("home.kpi.noSalesToday"),
            hintTone: kpis.salesTodayCount > 0 ? "positive" : "neutral",
          },
          {
            id: "fg",
            tone: "blue",
            icon: Package,
            label: t("home.kpi.finishedGoods"),
            value: `${formatFgQty(kpis.fgTotal)} ${t("home.kpi.fgUnit")}`,
            hint: t("home.kpi.fgHint"),
          },
          {
            id: "today",
            tone: "purple",
            icon: Layers,
            label: t("home.kpi.producedToday"),
            value: `${formatFgQty(kpis.producedToday)} м²`,
            hint: producedHint,
            hintTone: producedHintTone,
          },
        ]}
      />

      <DashSection title={t("home.quickActions")} tour="home-shortcuts" flush mobileList>
        <DashQuickActions actions={ownerMobileQuickActions(t)} layout="mobileStrip" />
      </DashSection>

      <DashSection title={t("home.recentOrders")} tour="home-orders" mobile mobileList>
        <DashRecentOrders
          orders={recentOrders}
          empty={t("crm.noOrders")}
          n={n}
          locale={loc}
          layout="mobileCards"
        />
      </DashSection>

      <div className={styles.mobileFooterLink}>
        <DashRecentOrdersFooterLink href="/orders?period=month">
          {t("home.viewAllOrders")}
        </DashRecentOrdersFooterLink>
      </div>
    </div>
  );
}
