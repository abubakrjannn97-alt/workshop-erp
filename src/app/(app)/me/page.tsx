import { requirePermission } from "@core/auth/authz";
import { prisma } from "@/lib/prisma";
import { D, qtyDisplay } from "@core/shared/decimal";
import { getTranslator } from "@core/shared/i18n/locale";
import { MeJobsView } from "@/components/me-jobs-view";
import type { MeJobsSnapshot } from "@/lib/offline/types";

export default async function MyJobsPage() {
  const session = await requirePermission("production.view");
  const { locale } = await getTranslator();

  const jobs = await prisma.productionOrder.findMany({
    where: {
      status: { in: ["OPEN", "IN_PROGRESS"] },
      batches: { some: { responsibleUserId: session.user.id } },
    },
    include: {
      order: { include: { customer: true, items: { include: { product: { include: { saleUnit: true } } } } } },
      batches: {
        where: { responsibleUserId: session.user.id },
        include: { materials: { include: { material: { include: { storageUnit: true } } } } },
        orderBy: { number: "asc" },
      },
    },
    orderBy: { dueAt: "asc" },
  });

  const current = jobs
    .flatMap((job) =>
      job.batches
        .filter((b) => b.status !== "CLOSED")
        .map((batch) => ({ job, batch })),
    )[0];

  const product = current?.job.order.items[0];
  const unit = product?.product.saleUnit.symbol ?? "м²";
  const planned = current ? D(String(current.job.plannedQty)) : D(0);
  const produced = current ? D(String(current.job.producedQty)) : D(0);
  const pct = planned.gt(0) ? Math.min(100, produced.div(planned).mul(100).toNumber()) : 0;

  const snapshot: MeJobsSnapshot = {
    updatedAt: new Date().toISOString(),
    current: current
      ? {
          batchId: current.batch.id,
          productionOrderId: current.job.id,
          productName: product?.product.name ?? "—",
          customerName: current.job.order.customer.name,
          plannedQty: qtyDisplay(current.job.plannedQty),
          producedQty: qtyDisplay(current.job.producedQty),
          jobPlannedQty: qtyDisplay(current.batch.plannedQty),
          unit,
          pct,
          materials: current.batch.materials.map((line) => ({
            materialId: line.materialId,
            plannedQty: qtyDisplay(line.plannedQty),
            name: line.material.name,
            symbol: line.material.storageUnit.symbol,
          })),
        }
      : null,
    jobs: jobs.map((job) => ({
      id: job.id,
      title: `${job.order.items[0]?.product.name ?? "—"} · ${job.order.customer.name}`,
      href: `/production/${job.id}`,
    })),
  };

  return <MeJobsView snapshot={snapshot} locale={locale} />;
}
