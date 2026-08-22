import { Trash2, Layers } from "lucide-react";
import { prisma } from "@core/infrastructure/prisma";
import { requireSession } from "@core/auth/authz";
import { refreshOwnerAlerts } from "@core/inventory/alerts";
import { getTranslator, intlLocale } from "@core/shared/i18n/locale";
import {
  DashGreeting,
  DashMetricStrip,
  DashProfitHero,
  DashQuickActions,
  DashRecentOrders,
  DashRecentOrdersFooterLink,
  DashSection,
  ownerMobileQuickActions,
} from "@/components/dashboard/dashboard-system";
import {
  fetchOwnerOperationalKpis,
  fetchOwnerProfitKpis,
  formatFgQty,
  serializeOwnerProfitKpis,
} from "@/components/dashboard/owner-kpi-data";
import styles from "@/components/dashboard/dash-home.module.css";

/**
 * Desktop home mirrors MobileOwnerHome 1:1 (same blocks, order, data, layouts).
 * Only wrapper class differs for desktop max-width / centering.
 */
export async function DesktopHome() {
  await requireSession();
  const { t, n, locale } = await getTranslator();
  const loc = intlLocale(locale);

  const [kpis, profitKpis, recentOrders] = await Promise.all([
    fetchOwnerOperationalKpis(),
    fetchOwnerProfitKpis(),
    prisma.order.findMany({
      include: {
        customer: true,
        status: true,
        items: { include: { product: true }, orderBy: { id: "asc" }, take: 3 },
      },
      orderBy: { createdAt: "desc" },
      take: 5,
    }),
  ]);
  await refreshOwnerAlerts();

  let producedHint = t("home.kpi.noChangeToday");
  let producedHintTone: "positive" | "negative" | "neutral" = "neutral";
  if (kpis.producedChangePct !== null && kpis.producedChangePct > 0) {
    producedHint = t("home.kpi.vsYesterdayUp").replace("{pct}", String(kpis.producedChangePct));
    producedHintTone = "positive";
  } else if (kpis.producedChangePct !== null && kpis.producedChangePct < 0) {
    producedHint = t("home.kpi.vsYesterdayDown").replace("{pct}", String(Math.abs(kpis.producedChangePct)));
    producedHintTone = "negative";
  }

  const scrapUnit = t("home.kpi.scrapUnit").trim();
  const scrapValue = scrapUnit
    ? `${formatFgQty(kpis.scrapToday)} ${scrapUnit}`
    : formatFgQty(kpis.scrapToday);
  const hasScrap = kpis.scrapToday.gt(0);

  return (
    <div className={`${styles.home} ${styles.homeDesktop}`}>
      <DashGreeting t={t} mobile />

      <DashProfitHero
        data={serializeOwnerProfitKpis(profitKpis)}
        label={t("home.kpi.profit")}
        periodLabels={{
          today: t("orders.periodToday"),
          week: t("orders.periodWeek"),
          month: t("orders.periodMonth"),
        }}
      />

      <DashMetricStrip
        variant="compact"
        metrics={[
          {
            id: "scrap",
            tone: "red",
            icon: Trash2,
            label: t("home.kpi.scrapToday"),
            value: scrapValue,
            hint: hasScrap ? t("home.kpi.scrapTodayHint") : t("home.kpi.noScrapToday"),
            hintTone: hasScrap ? "negative" : "neutral",
            href: "/production/scrap",
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
