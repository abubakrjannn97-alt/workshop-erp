import { requireSession } from "@core/auth/authz";
import { getTranslator } from "@core/shared/i18n/locale";
import {
  DashOwnerHomeBody,
  DashQuickActions,
  DashSection,
  ownerMobileQuickActions,
} from "@/components/dashboard/dashboard-system";
import { greetingTitle } from "@/components/dashboard/dash-greeting";
import { fetchOwnerDashboardSnapshots } from "@/components/dashboard/owner-kpi-data";
import styles from "@/components/dashboard/dash-home.module.css";

export async function MobileOwnerHome() {
  await requireSession();
  const { t, n } = await getTranslator();

  const snapshots = await fetchOwnerDashboardSnapshots(t, n);

  return (
    <div className={`${styles.home} ${styles.homeMobile}`}>
      <DashOwnerHomeBody
        snapshots={snapshots}
        greetingTitle={greetingTitle(t)}
        profitLabel={t("home.kpi.profit")}
        scrapLabel={t("home.kpi.scrapToday")}
        producedLabel={t("home.kpi.producedToday")}
        periodLabels={{
          today: t("orders.periodToday"),
          week: t("orders.periodWeek"),
          month: t("orders.periodMonth"),
        }}
        recentOrdersTitle={t("home.recentOrders")}
        emptyOrders={t("crm.noOrders")}
        ordersPeriodHref="/orders?period=month"
        viewAllOrdersLabel={t("home.viewAllOrders")}
        quickActions={
          <DashSection title={t("home.quickActions")} tour="home-shortcuts" flush mobileList>
            <DashQuickActions actions={ownerMobileQuickActions(t)} layout="mobileStrip" />
          </DashSection>
        }
      />
    </div>
  );
}
