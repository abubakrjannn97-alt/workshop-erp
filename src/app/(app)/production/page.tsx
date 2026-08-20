import { getTranslator } from "@core/shared/i18n/locale";
import { prisma } from "@core/infrastructure/prisma";
import { requirePermission } from "@core/auth/authz";
import { isProductionScopedWorker } from "@core/production/batch-auth";
import styles from "./production.module.css";

export default async function ProductionPage() {
  const { t } = await getTranslator();
  const session = await requirePermission("production.view");

  const scoped = isProductionScopedWorker(session.user.roleCode, session.user.permissions ?? []);
  const scopedFilter = scoped ? { batches: { some: { responsibleUserId: session.user.id } } } : {};

  const [inWork, open, done, withScrap, stages] = await Promise.all([
    prisma.productionOrder.count({ where: { status: "IN_PROGRESS", ...scopedFilter } }),
    prisma.productionOrder.count({ where: { status: "OPEN", ...scopedFilter } }),
    prisma.productionOrder.count({ where: { status: "DONE", ...scopedFilter } }),
    prisma.productionOrder.count({ where: { scrapQty: { gt: 0 }, ...scopedFilter } }),
    prisma.productionStage.findMany({
      where: {
        isActive: true,
        code: { in: ["MIX", "FORM", "DRY", "PACK"] },
      },
      orderBy: { sortOrder: "asc" },
    }),
  ]);

  const defaultStages = [
    { code: "MIX", name: "Замес", sortOrder: 1, descKey: "prod.stageDesc.MIX" },
    { code: "FORM", name: "Формовка", sortOrder: 2, descKey: "prod.stageDesc.FORM" },
    { code: "DRY", name: "Сушка", sortOrder: 3, descKey: "prod.stageDesc.DRY" },
    { code: "PACK", name: "Упаковка", sortOrder: 4, descKey: "prod.stageDesc.PACK" },
  ];

  const displayStages = stages.length > 0
    ? stages.map((s, idx) => {
        const fallback = defaultStages.find((d) => d.code === s.code);
        return {
          id: s.id,
          number: idx + 1,
          name: s.name,
          desc: fallback ? t(fallback.descKey) : "",
        };
      })
    : defaultStages.map((s) => ({
        id: s.code,
        number: s.sortOrder,
        name: s.name,
        desc: t(s.descKey),
      }));

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <div className={styles.headerText}>
          <h1 className={styles.title}>{t("page.production")}</h1>
          <p className={styles.subtitle}>{t("prod.hint")}</p>
        </div>
      </header>

      <div className={styles.summary}>
        <div className={styles.summaryBox}>
          <p className={styles.summaryLabel}>{t("prod.inProgress")}</p>
          <p className={styles.summaryValue}>{inWork}</p>
        </div>
        <div className={styles.summaryBox}>
          <p className={styles.summaryLabel}>{t("prod.open")}</p>
          <p className={styles.summaryValue}>{open}</p>
        </div>
        <div className={styles.summaryBox}>
          <p className={styles.summaryLabel}>{t("prod.done")}</p>
          <p className={styles.summaryValue}>{done}</p>
        </div>
        <div className={styles.summaryBox}>
          <p className={styles.summaryLabel}>{t("common.scrap")}</p>
          <p className={withScrap > 0 ? styles.summaryValueWarn : styles.summaryValue}>{withScrap}</p>
        </div>
      </div>

      <section className={styles.section}>
        <div className={styles.sectionHead}>
          <h2 className={styles.sectionTitle}>{t("prod.stages")}</h2>
        </div>
        <div className={styles.sectionBody}>
          <div className={styles.stageGrid}>
            {displayStages.map((stage) => (
              <div key={stage.id} className={styles.stageCard}>
                <div className={styles.stageNumber}>{stage.number}</div>
                <div className={styles.stageInfo}>
                  <p className={styles.stageName}>{stage.name}</p>
                  {stage.desc ? <p className={styles.stageDesc}>{stage.desc}</p> : null}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
