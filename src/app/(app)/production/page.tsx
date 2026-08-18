import { getTranslator } from "@core/shared/i18n/locale";
import { prisma } from "@core/infrastructure/prisma";
import { requirePermission, hasPermission } from "@core/auth/authz";
import { qtyDisplay } from "@core/shared/decimal";
import { StatusBadge, jobTone } from "@/components/status-badge";
import { PageHeader } from "@/components/page-header";
import { RevealList } from "@/components/reveal-list";
import { DashPanel } from "@/components/dash-panel";
import { FormField } from "@/components/form-field";
import { PendingButton } from "@/components/pending-button";
import { saveProductionStage } from "@/app/actions/production";
import { isProductionScopedWorker } from "@core/production/batch-auth";
import {
  DataList,
  DataListCell,
  DataListEmpty,
  DataListHead,
  DataListHeadCell,
  DataListPrimary,
  DataListRow,
  DataTableSection,
  dataListStyles,
} from "@/components/data-table";

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

  async function stageCtor(formData: FormData) {
    "use server";
    await saveProductionStage(formData);
  }

  return (
    <div className="page-stack">
      <PageHeader title={t("page.production")} description={t("prod.hint")} />
      {canManage ? (
        <DashPanel title={t("prod.stages")}>
          <ul className="mb-3 text-sm">
            {stages.map((s) => (
              <li key={s.id}>
                {s.sortOrder}. {s.name} ({s.code})
              </li>
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
        </DashPanel>
      ) : null}
      <DataTableSection tour="production-list">
        {jobs.length === 0 ? (
          <DataListEmpty>{t("prod.empty")}</DataListEmpty>
        ) : (
          <DataList layout="cols5">
            <DataListHead layout="cols5">
              <DataListHeadCell>{t("common.customer")}</DataListHeadCell>
              <DataListHeadCell>{t("common.product")}</DataListHeadCell>
              <DataListHeadCell align="right">{t("common.progress")}</DataListHeadCell>
              <DataListHeadCell align="right">{t("common.scrap")}</DataListHeadCell>
              <DataListHeadCell align="right">{t("common.status")}</DataListHeadCell>
            </DataListHead>
            <RevealList moreLabel={t("home.seeAll")} lessLabel={t("home.hide")} className={dataListStyles.rows} limit={5}>
              {jobs.map((job) => {
                const product = job.order.items[0]?.product.name ?? "—";
                return (
                  <DataListRow key={job.id} layout="cols5">
                    <DataListPrimary title={job.order.customer.name} href={`/production/${job.id}`} />
                    <DataListCell label={t("common.product")}>{product}</DataListCell>
                    <DataListCell label={t("common.progress")} align="right">
                      <span className="font-mono text-xs tabular-nums">
                        {qtyDisplay(job.producedQty)} / {qtyDisplay(job.plannedQty)}
                      </span>
                    </DataListCell>
                    <DataListCell label={t("common.scrap")} align="right">
                      <span className="font-mono text-xs tabular-nums">{qtyDisplay(job.scrapQty)}</span>
                    </DataListCell>
                    <DataListCell label={t("common.status")} align="right">
                      <StatusBadge label={jobStatus(t, job.status) ?? job.status} tone={jobTone(job.status)} />
                    </DataListCell>
                  </DataListRow>
                );
              })}
            </RevealList>
          </DataList>
        )}
      </DataTableSection>
    </div>
  );
}
