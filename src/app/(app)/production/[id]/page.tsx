import { getTranslator, intlLocale } from "@core/shared/i18n/locale";
import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@core/infrastructure/prisma";
import { requirePermission } from "@core/auth/authz";
import { hasPermission } from "@core/auth/authz";
import { isProductionScopedWorker } from "@core/production/batch-auth";
import { D, moneyDisplay, qtyDisplay } from "@core/shared/decimal";
import { closeBatch, createBatch, assignProductionStage } from "@/app/actions/production";
import { PendingButton } from "@/components/pending-button";
import { IdempotencyField } from "@/components/idempotency-field";
import { PageHeader } from "@/components/page-header";
import { FormField } from "@/components/form-field";
import { DashPanel } from "@/components/dash-panel";
import { DashKpiGrid } from "@/components/dashboard/dashboard-system";
import { KpiCard } from "@/components/kpi-card";
import { StatusBadge, jobTone } from "@/components/status-badge";

function jobStatus(t: (k: string) => string, s: string) {
  const map: Record<string, string> = {
    OPEN: t("prod.open"),
    IN_PROGRESS: t("prod.inProgress"),
    DONE: t("prod.done"),
  };
  return map[s] ?? s;
}

export default async function ProductionJobPage({ params }: { params: Promise<{ id: string }> }) {
  const { t, locale } = await getTranslator();
  const session = await requirePermission("production.view");
  const { id } = await params;
  const job = await prisma.productionOrder.findUnique({
    where: { id },
    include: {
      order: {
        include: {
          customer: true,
          items: { include: { product: { include: { saleUnit: true, outputUnit: true } } } },
          materials: { include: { material: { include: { storageUnit: true } } } },
        },
      },
      batches: {
        include: {
          materials: { include: { material: { include: { storageUnit: true } } } },
          scraps: true,
        },
        orderBy: { number: "asc" },
      },
    },
  });
  if (!job) notFound();

  const scoped = isProductionScopedWorker(session.user.roleCode, session.user.permissions ?? []);
  if (scoped && !job.batches.some((b) => b.responsibleUserId === session.user.id)) {
    notFound();
  }

  const canManage = hasPermission(session.user.permissions, session.user.roleCode, "production.manage");
  const canReport = hasPermission(session.user.permissions, session.user.roleCode, "production.report");
  const workers = await prisma.user.findMany({
    where: { archivedAt: null, isActive: true },
    select: { id: true, name: true },
    orderBy: { name: "asc" },
  });
  const stages = canManage
    ? await prisma.productionStage.findMany({ where: { isActive: true }, orderBy: { sortOrder: "asc" } })
    : [];
  const remaining = D(String(job.plannedQty)).sub(
    job.batches.reduce((s, b) => s.add(String(b.plannedQty)), D(0)),
  );
  const product = job.order.items[0];
  const unitSymbol = product?.product.saleUnit.symbol ?? t("orders.unitFallback");

  async function addBatch(formData: FormData) {
    "use server";
    await createBatch(formData);
  }
  async function finish(formData: FormData) {
    "use server";
    await closeBatch(formData);
  }
  async function stageAction(formData: FormData) {
    "use server";
    await assignProductionStage(formData);
  }

  return (
    <div className="page-stack">
      <PageHeader
        title={`${t("common.order")} #${job.order.number}`}
        description={[
          job.order.customer.name,
          product ? `${product.product.name} ${qtyDisplay(product.quantity)} ${unitSymbol}` : null,
          job.dueAt ? `${t("prod.due")} ${job.dueAt.toLocaleDateString(intlLocale(locale))}` : null,
        ]
          .filter(Boolean)
          .join(" · ")}
        actions={
          <div className="flex flex-wrap gap-2">
            <Link href={`/production/${job.id}/print`} className="ui-btn-secondary">
              {t("prod.printJob")}
            </Link>
            <Link href={`/orders/${job.orderId}`} className="ui-btn-secondary">
              {t("prod.openOrder")}
            </Link>
          </div>
        }
      />

      <DashKpiGrid cols="4">
        <div className="ui-card px-3 py-2">
          <p className="text-[10px] font-semibold uppercase tracking-wide text-[var(--color-text-muted)]">{t("common.status")}</p>
          <div className="mt-2">
            <StatusBadge label={jobStatus(t, job.status)} tone={jobTone(job.status)} />
          </div>
        </div>
        <KpiCard
          label={t("common.progress")}
          value={`${qtyDisplay(job.producedQty)} / ${qtyDisplay(job.plannedQty)} ${unitSymbol}`}
          tone="in"
        />
        <KpiCard label={t("common.scrap")} value={qtyDisplay(job.scrapQty)} tone="out" />
        <KpiCard label={t("prod.batch")} value={String(job.batches.length)} tone="ink" />
      </DashKpiGrid>

      {canManage && stages.length > 0 ? (
        <DashPanel title={t("prod.stage")}>
          <form action={stageAction} className="flex flex-wrap items-end gap-3">
            <input type="hidden" name="productionOrderId" value={job.id} />
            <FormField label={t("prod.stage")}>
              <select name="stageId" defaultValue={job.stageId ?? ""} className="ui-input">
                <option value="">—</option>
                {stages.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>
            </FormField>
            <PendingButton className="ui-btn-secondary min-h-[44px]" pendingLabel={t("common.sending")}>
              {t("common.save")}
            </PendingButton>
          </form>
        </DashPanel>
      ) : null}

      <DashPanel title={t("prod.planMaterials")}>
        <ul className="ui-list text-sm">
          {job.order.materials.map((need) => (
            <li key={need.id}>
              {need.material.name}: {qtyDisplay(need.plannedQty)} {need.material.storageUnit.symbol}
            </li>
          ))}
        </ul>
      </DashPanel>

      {canManage && remaining.gt(0) && job.status !== "DONE" ? (
        <DashPanel title={t("prod.newBatch")}>
          <form action={addBatch} className="grid max-w-xl gap-3 sm:grid-cols-2">
            <input type="hidden" name="productionOrderId" value={job.id} />
            <FormField
              label={`${t("prod.planQty")}, ${unitSymbol}`}
              hint={`${t("prod.remaining")} ${qtyDisplay(remaining)}`}
              className="sm:col-span-2"
            >
              <input name="plannedQty" defaultValue={qtyDisplay(remaining)} className="ui-input" inputMode="decimal" />
            </FormField>
            <FormField label={t("prod.responsible")} className="sm:col-span-2">
              <select name="responsibleUserId" className="ui-input">
                <option value="">—</option>
                {workers.map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.name}
                  </option>
                ))}
              </select>
            </FormField>
            <FormField label={t("common.comment")} className="sm:col-span-2">
              <input name="comment" placeholder={t("common.comment")} className="ui-input" />
            </FormField>
            <PendingButton className="ui-btn-primary min-h-[44px] sm:col-span-2" pendingLabel={t("common.sending")}>
              {t("prod.createBatch")}
            </PendingButton>
          </form>
        </DashPanel>
      ) : null}

      {job.batches.map((batch) => {
        const scrapPct =
          D(String(batch.actualQty)).add(batch.scrapQty).gt(0)
            ? D(String(batch.scrapQty)).div(D(String(batch.actualQty)).add(batch.scrapQty)).mul(100)
            : D(0);
        return (
          <DashPanel
            key={batch.id}
            title={`${t("prod.batch")} №${batch.number}`}
            action={
              <StatusBadge
                label={batch.status === "CLOSED" ? t("prod.closed") : t("prod.opened")}
                tone={batch.status === "CLOSED" ? "good" : "warn"}
              />
            }
          >
            <p className="mb-3 text-[12px] text-[var(--muted)]">
              {t("orders.plan")} {qtyDisplay(batch.plannedQty)} {unitSymbol}
            </p>
            {batch.status === "CLOSED" ? (
              <div className="space-y-2 text-sm">
                <p>
                  {t("prod.goodQty")}: {qtyDisplay(batch.actualQty)}, {t("common.scrap")}: {qtyDisplay(batch.scrapQty)} (
                  {qtyDisplay(scrapPct)}%)
                </p>
                <ul className="ui-list space-y-1">
                  {batch.materials.map((line) => {
                    const plan = D(String(line.plannedQty));
                    const fact = D(String(line.actualQty));
                    const over = plan.gt(0) ? fact.sub(plan).div(plan).mul(100) : D(0);
                    return (
                      <li key={line.id}>
                        {line.material.name}: {t("orders.plan")} {qtyDisplay(plan)} {line.material.storageUnit.symbol},{" "}
                        {t("prod.actual")} {qtyDisplay(fact)}
                        {over.gte(5) ? (
                          <span className="ml-2 text-amber-800">
                            {t("prod.overNorm")} {qtyDisplay(over)}%
                          </span>
                        ) : null}
                      </li>
                    );
                  })}
                </ul>
                {batch.scraps.map((s) => (
                  <p key={s.id} className="text-xs text-[var(--muted)]">
                    {t("common.scrap")}: {qtyDisplay(s.quantity)} · {s.reason}
                    {s.materialCost ? ` · ${moneyDisplay(s.materialCost)} с` : ""}
                  </p>
                ))}
              </div>
            ) : canReport && (!scoped || batch.responsibleUserId === session.user.id) ? (
              <form action={finish} className="grid gap-3 sm:grid-cols-2">
                <input type="hidden" name="batchId" value={batch.id} />
                <IdempotencyField prefix={`close-${batch.id}`} />
                <FormField label={t("prod.actualGood")}>
                  <input name="actualQty" defaultValue={qtyDisplay(batch.plannedQty)} className="ui-input" inputMode="decimal" />
                </FormField>
                <FormField label={t("common.scrap")}>
                  <input name="scrapQty" defaultValue="0" className="ui-input" inputMode="decimal" />
                </FormField>
                <FormField label={t("prod.scrapReason")} className="sm:col-span-2">
                  <input name="scrapReason" placeholder={t("prod.scrapReason")} className="ui-input" />
                </FormField>
                <FormField label={t("prod.scrapPhoto")} className="sm:col-span-2">
                  <input name="photoUrl" placeholder={t("prod.scrapPhoto")} className="ui-input" />
                </FormField>
                {batch.materials.map((line) => (
                  <FormField
                    key={line.id}
                    label={`${line.material.name}, ${t("prod.actual")} (${line.material.storageUnit.symbol})`}
                    hint={`${t("orders.plan")} ${qtyDisplay(line.plannedQty)}`}
                    className="sm:col-span-2"
                  >
                    <input
                      name={`actual-${line.materialId}`}
                      defaultValue={qtyDisplay(line.plannedQty)}
                      className="ui-input"
                      inputMode="decimal"
                    />
                  </FormField>
                ))}
                <FormField label={t("common.comment")} className="sm:col-span-2">
                  <textarea name="comment" placeholder={t("common.comment")} className="ui-input min-h-[4rem]" />
                </FormField>
                <PendingButton className="ui-btn-primary min-h-[44px] sm:col-span-2" pendingLabel={t("common.sending")}>
                  {t("prod.closeBatch")}
                </PendingButton>
              </form>
            ) : (
              <p className="text-sm text-[var(--muted)]">{t("prod.awaitFact")}</p>
            )}
          </DashPanel>
        );
      })}
    </div>
  );
}
