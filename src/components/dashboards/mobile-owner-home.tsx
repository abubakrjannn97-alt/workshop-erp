import { requireSession } from "@core/auth/authz";
import { getShellData } from "@core/infrastructure/shell-data";
import { getTranslator } from "@core/shared/i18n/locale";
import {
  DashOwnerHomeBody,
  DashQuickActions,
  DashSection,
  ownerMobileQuickActions,
} from "@/components/dashboard/dashboard-system";
import { greetingTitle } from "@/components/dashboard/dash-greeting";
import { fetchOwnerDashboardSnapshots } from "@/components/dashboard/owner-kpi-data";
import { listUserWorkshops, resolveActiveWorkshopId } from "@core/workshop/workshop-context";
import styles from "@/components/dashboard/dash-home.module.css";

export async function MobileOwnerHome() {
  const session = await requireSession();
  const activeWorkshopId = await resolveActiveWorkshopId(session.user.id, session.user.roleCode ?? "employee");
  const [{ t, n, locale }, shell, workshops] = await Promise.all([
    getTranslator(),
    getShellData(session.user.id, activeWorkshopId),
    listUserWorkshops(session.user.id, session.user.roleCode ?? "employee"),
  ]);

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
        unread={shell.unread}
        locale={locale}
        workshops={workshops}
        activeWorkshopId={activeWorkshopId}
        quickActions={
          <DashSection title={t("home.quickActions")} tour="home-shortcuts" flush mobileList>
            <DashQuickActions actions={ownerMobileQuickActions(t)} layout="mobileStrip" />
          </DashSection>
        }
      />
    </div>
  );
}
