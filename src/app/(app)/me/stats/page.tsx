import { requirePermission } from "@core/auth/authz";
import { getTranslator } from "@core/shared/i18n/locale";
import { fetchWorkerPeriodSnapshots, fetchWorkerProductionByPeriod } from "@core/worker/worker-data";
import { WorkerStatsBody } from "@/components/worker-stats-body";

export default async function WorkerStatsPage() {
  const session = await requirePermission("production.view");
  const { t } = await getTranslator();
  const [snapshots, productionByPeriod] = await Promise.all([
    fetchWorkerPeriodSnapshots(session.user.id),
    fetchWorkerProductionByPeriod(session.user.id),
  ]);

  return (
    <WorkerStatsBody
      snapshots={snapshots}
      productionByPeriod={productionByPeriod}
      periodLabels={{
        today: t("orders.periodToday"),
        week: t("orders.periodWeek"),
        month: t("orders.periodMonth"),
      }}
      producedLabel={t("me.workerProduced")}
      earnedLabel={t("me.workerEarned")}
      debtLabel={t("me.workerDebt")}
      rateLabel={t("me.workerUnitRate")}
      emptyLabel={t("me.workerNoProduction")}
    />
  );
}
