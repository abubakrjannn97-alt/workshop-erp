import { getTranslator } from "@core/shared/i18n/locale";
import Link from "next/link";
import { prisma } from "@core/infrastructure/prisma";
import { requirePermission, hasPermission } from "@core/auth/authz";
import { qtyDisplay } from "@core/shared/decimal";
import { StatusBadge, jobTone } from "@/components/status-badge";
import { RevealList } from "@/components/reveal-list";
import { FormField } from "@/components/form-field";
import { PendingButton } from "@/components/pending-button";
import { saveProductionStage } from "@/app/actions/production";
import { isProductionScopedWorker } from "@core/production/batch-auth";
import { ChevronRight, Factory } from "lucide-react";
import { ICON_STROKE } from "@/components/nav-icons";
import { EmptyState } from "@/components/empty-state";
import styles from "./production.module.css";

function jobStatus(t: (k: string) => string, s: string) {
  const map: Record<string, string> = {
    OPEN: t("prod.open"),
    IN_PROGRESS: t("prod.inProgress"),
    DONE: t("prod.done"),
  };
  return map[s] ?? s;
}

export default async function ProductionPage() {
  const { t } = await getTranslator();
  const session = await requirePermission("production.view");
  const canManage = hasPermission(session.user.permissions, session.user.roleCode, "production.manage");
  const [jobs, stages] = await Promise.all([
    prisma.productionOrder.findMany({
      where: isProductionScopedWorker(session.user.roleCode, session.user.permissions ?? [])
        ? { batches: { some: { responsibleUserId: session.user.id } } }
        : undefined,
      include: {
        order: { include: { customer: true, items: { include: { product: true } } } },
        batches: true,
      },
      orderBy: { createdAt: "desc" },
      take: 40,
    }),
    canManage
      ? prisma.productionStage.findMany({ orderBy: { sortOrder: "asc" } })
      : Promise.resolve([]),
  ]);

  const inWork = jobs.filter((j) => j.status === "IN_PROGRESS").length;
  const open = jobs.filter((j) => j.status === "OPEN").length;
  const done = jobs.filter((j) => j.status === "DONE").length;
  const withScrap = jobs.filter((j) => j.scrapQty && Number(j.scrapQty) > 0).length;

  async function stageCtor(formData: FormData) {
    "use server";
    await saveProductionStage(formData);
  }

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <div className={styles.headerText}>
          <h1 className={styles.title}>{t("page.production")}</h1>
          <p className={styles.subtitle}>{t("prod.hint")}</p>
        </div>
        <div className={styles.headerActions}>
          <Link href="/production/batches" className={styles.ghostLink}>{t("nav.batches")}</Link>
          <Link href="/production/scrap" className={styles.ghostLink}>{t("nav.scrap")}</Link>
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

      {canManage ? (
        <section className={styles.section}>
          <div className={styles.sectionHead}>
            <h2 className={styles.sectionTitle}>{t("prod.stages")}</h2>
          </div>
          <div className={styles.sectionBody}>
            <ul className={styles.stageList}>
              {stages.map((s) => (
                <li key={s.id}>{s.sortOrder}. {s.name} ({s.code})</li>
              ))}
            </ul>
            <form action={stageCtor} className="grid gap-3 sm:grid-cols-3">
              <FormField label={t("common.code")}>
                <input name="code" className="ui-input" />
              </FormField>
              <FormField label={t("common.name")}>
                <input name="name" className="ui-input" />
              </FormField>
              <FormField label={t("prod.sortOrder")}>
                <input name="sortOrder" defaultValue={String((stages.at(-1)?.sortOrder ?? 0) + 10)} className="ui-input" />
              </FormField>
              <PendingButton className="ui-btn-secondary min-h-[44px] sm:col-span-3" pendingLabel={t("common.sending")}>
                {t("prod.addStage")}
              </PendingButton>
            </form>
          </div>
        </section>
      ) : null}

      <section className={styles.section} data-tour="production-list">
        <div className={styles.sectionHead}>
          <h2 className={styles.sectionTitle}>{t("prod.jobsTitle")}</h2>
        </div>
        {jobs.length === 0 ? (
          <div className={styles.sectionBody}>
            <EmptyState icon={Factory} title={t("prod.empty")} description="" />
          </div>
        ) : (
          <>
            <div className={`${styles.tableHead} ${styles.cols5}`}>
              <span>{t("common.customer")}</span>
              <span>{t("common.product")}</span>
              <span className={styles.tableHeadRight}>{t("common.progress")}</span>
              <span className={styles.tableHeadRight}>{t("common.scrap")}</span>
              <span className={styles.tableHeadRight}>{t("common.status")}</span>
              <span aria-hidden />
            </div>
            <RevealList moreLabel={t("home.seeAll")} lessLabel={t("home.hide")} className={styles.tableBody} limit={10}>
              {jobs.map((job) => {
                const product = job.order.items[0]?.product.name ?? "—";
                return (
                  <li key={job.id}>
                    <Link href={`/production/${job.id}`} className={`${styles.tableRow} ${styles.cols5}`}>
                      <span className={styles.cellBold}>{job.order.customer.name}</span>
                      <span className={styles.cellText}>{product}</span>
                      <span className={styles.cellMono}>{qtyDisplay(job.producedQty)} / {qtyDisplay(job.plannedQty)}</span>
                      <span className={styles.cellMono}>{qtyDisplay(job.scrapQty)}</span>
                      <span style={{ textAlign: "right" }}>
                        <StatusBadge label={jobStatus(t, job.status)} tone={jobTone(job.status)} />
                      </span>
                      <span className={styles.chevron} aria-hidden>
                        <ChevronRight size={16} strokeWidth={ICON_STROKE} />
                      </span>
                    </Link>
                  </li>
                );
              })}
            </RevealList>
            <ul className={styles.mobileList}>
              {jobs.map((job) => {
                const product = job.order.items[0]?.product.name ?? "—";
                return (
                  <li key={job.id}>
                    <Link href={`/production/${job.id}`} className={styles.mobileCard}>
                      <div className={styles.mobileTop}>
                        <span className={styles.mobileName}>{job.order.customer.name}</span>
                        <span className={styles.chevron} aria-hidden>
                          <ChevronRight size={16} strokeWidth={ICON_STROKE} />
                        </span>
                      </div>
                      <p className={styles.mobileMeta}>
                        {product} · {qtyDisplay(job.producedQty)}/{qtyDisplay(job.plannedQty)}
                      </p>
                      <div className={styles.mobileBottom}>
                        <StatusBadge label={jobStatus(t, job.status)} tone={jobTone(job.status)} />
                      </div>
                    </Link>
                  </li>
                );
              })}
            </ul>
          </>
        )}
      </section>
    </div>
  );
}
