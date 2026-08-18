import Link from "next/link";
import { prisma } from "@core/infrastructure/prisma";
import { qtyDisplay } from "@core/shared/decimal";
import { getTranslator } from "@core/shared/i18n/locale";
import { getDomainConfig } from "@core/config/domain-config";
import { PageHeader } from "@/components/page-header";
import { KpiCard } from "@/components/kpi-card";
import { DashPanel } from "@/components/dash-panel";
import { DashKpiGrid } from "@/components/dashboard/dashboard-system";
import { RevealList } from "@/components/reveal-list";

export async function ProductionHome() {
  const { t } = await getTranslator();
  const domainConfig = await getDomainConfig();
  const outputUnit = await prisma.unit.findUnique({
    where: { code: domainConfig.product.defaultOutputUnit },
  });
  const outputUnitSymbol = outputUnit?.symbol ?? t("common.unitGeneric");
  const start = new Date();
  start.setDate(1);
  start.setHours(0, 0, 0, 0);

  const [openJobs, openBatches, scrap] = await Promise.all([
    prisma.productionOrder.findMany({
      where: { status: { in: ["OPEN", "IN_PROGRESS"] } },
      include: { order: { include: { customer: true, items: { include: { product: true } } } } },
      orderBy: { dueAt: "asc" },
      take: 20,
    }),
    prisma.productionBatch.count({ where: { status: "OPEN" } }),
    prisma.scrapRecord.aggregate({ where: { createdAt: { gte: start } }, _sum: { quantity: true } }),
  ]);

  const overdue = openJobs.filter((j) => j.dueAt && j.dueAt < new Date());

  return (
    <div className="page-stack">
      <PageHeader title={t("nav.home")} />
      <DashKpiGrid cols="3" tour="home-kpis">
        <KpiCard href="/production" label={t("dash.openJobs")} value={String(openJobs.length)} tone="ink" />
        <KpiCard href="/production/batches" label={t("nav.batches")} value={String(openBatches)} tone="ink" />
        <KpiCard href="/production/scrap" label={t("nav.scrap")} value={`${qtyDisplay(scrap._sum.quantity ?? 0)} ${outputUnitSymbol}`} tone="out" />
      </DashKpiGrid>
      {overdue.length > 0 ? (
        <DashPanel title={t("home.alert.overdue")}>
          <ul className="ui-list">
            {overdue.map((j) => (
              <li key={j.id} className="ui-list-row min-h-[44px] text-sm">
                <Link href={`/production/${j.id}`} className="font-medium hover:underline">
                  {j.order.customer.name} · {j.order.items[0]?.product.name}
                </Link>
              </li>
            ))}
          </ul>
        </DashPanel>
      ) : null}
      <DashPanel title={t("dash.openJobs")} tour="home-work">
        <RevealList moreLabel={t("home.seeAll")} lessLabel={t("home.hide")} limit={6} className="ui-list">
          {openJobs.map((j) => (
            <li key={j.id} className="ui-list-row flex min-h-[44px] items-center justify-between gap-2 text-sm">
              <Link href={`/production/${j.id}`} className="truncate hover:underline">
                {j.order.customer.name} · {j.order.items[0]?.product.name ?? "—"}
              </Link>
              <span className="shrink-0 font-mono text-xs tabular-nums">
                {qtyDisplay(j.producedQty)} / {qtyDisplay(j.plannedQty)}
              </span>
            </li>
          ))}
        </RevealList>
      </DashPanel>
    </div>
  );
}
