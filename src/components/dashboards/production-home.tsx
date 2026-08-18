import Link from "next/link";
import { prisma } from "@core/infrastructure/prisma";
import { qtyDisplay } from "@core/shared/decimal";
import { getTranslator } from "@core/shared/i18n/locale";
import { getDomainConfig } from "@core/config/domain-config";
import { PageHeader } from "@/components/page-header";
import { KpiCard } from "@/components/kpi-card";
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
      <div className="grid gap-2 sm:grid-cols-3" data-tour="home-kpis">
        <KpiCard href="/production" label={t("dash.openJobs")} value={String(openJobs.length)} tone="ink" />
        <KpiCard href="/production/batches" label={t("nav.batches")} value={String(openBatches)} tone="ink" />
        <KpiCard href="/production/scrap" label={t("nav.scrap")} value={`${qtyDisplay(scrap._sum.quantity ?? 0)} ${outputUnitSymbol}`} tone="out" />
      </div>
      {overdue.length > 0 ? (
        <section className="ui-card">
          <h2 className="text-sm font-semibold">{t("home.alert.overdue")}</h2>
          <ul className="mt-2 space-y-1 text-sm">
            {overdue.map((j) => (
              <li key={j.id}>
                <Link href={`/production/${j.id}`} className="hover:underline">
                  {j.order.customer.name} · {j.order.items[0]?.product.name}
                </Link>
              </li>
            ))}
          </ul>
        </section>
      ) : null}
      <section className="ui-card" data-tour="home-work">
        <h2 className="text-sm font-semibold">{t("dash.openJobs")}</h2>
        <RevealList moreLabel={t("home.seeAll")} lessLabel={t("home.hide")} limit={6}>
          {openJobs.map((j) => (
            <li key={j.id} className="flex justify-between gap-2 text-sm">
              <Link href={`/production/${j.id}`} className="truncate hover:underline">
                {j.order.customer.name} · {j.order.items[0]?.product.name ?? "—"}
              </Link>
              <span className="shrink-0 font-mono text-xs">
                {qtyDisplay(j.producedQty)} / {qtyDisplay(j.plannedQty)}
              </span>
            </li>
          ))}
        </RevealList>
      </section>
    </div>
  );
}
