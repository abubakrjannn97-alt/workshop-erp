import { getTranslator } from "@core/shared/i18n/locale";
import { prisma } from "@core/infrastructure/prisma";
import { requirePermission } from "@core/auth/authz";
import { isProductionScopedWorker } from "@core/production/batch-auth";
import { ProductionMetrics } from "./production-metrics";
import styles from "./production.module.css";

export default async function ProductionPage() {
  const { t } = await getTranslator();
  const session = await requirePermission("production.view");

  const scoped = isProductionScopedWorker(session.user.roleCode, session.user.permissions ?? []);
  const scopedFilter = scoped ? { batches: { some: { responsibleUserId: session.user.id } } } : {};

  const [inWork, open, done, withScrap] = await Promise.all([
    prisma.productionOrder.count({ where: { status: "IN_PROGRESS", ...scopedFilter } }),
    prisma.productionOrder.count({ where: { status: "OPEN", ...scopedFilter } }),
    prisma.productionOrder.count({ where: { status: "DONE", ...scopedFilter } }),
    prisma.productionOrder.count({ where: { scrapQty: { gt: 0 }, ...scopedFilter } }),
  ]);

  const metrics = [
    {
      id: "in-progress",
      label: t("prod.inProgress"),
      value: String(inWork),
      hint: t("prod.kpiInProgressHint"),
      tone: "blue" as const,
      icon: "inProgress" as const,
    },
    {
      id: "waiting",
      label: t("prod.kpiWaiting"),
      value: String(open),
      hint: t("prod.kpiWaitingHint"),
      tone: "purple" as const,
      icon: "waiting" as const,
    },
    {
      id: "done",
      label: t("prod.done"),
      value: String(done),
      hint: t("prod.kpiDoneHint"),
      tone: "green" as const,
      icon: "done" as const,
    },
    {
      id: "scrap",
      label: t("common.scrap"),
      value: String(withScrap),
      hint: t("prod.kpiScrapHint"),
      tone: "warn" as const,
      icon: "scrap" as const,
    },
  ];

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <div className={styles.headerText}>
          <h1 className={styles.title}>{t("page.production")}</h1>
        </div>
      </header>

      <ProductionMetrics items={metrics} />
    </div>
  );
}
