import { requirePermission } from "@/lib/authz";
import { prisma } from "@/lib/prisma";
import { D, qtyDisplay } from "@/lib/decimal";
import { getTranslator } from "@/lib/locale";
import { PageHeader } from "@/components/page-header";
import { CloseBatchForm } from "@/components/close-batch-form";
import Link from "next/link";

export default async function MyJobsPage() {
  const session = await requirePermission("production.view");
  const { t } = await getTranslator();

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

  return (
    <div className="page-stack">
      <PageHeader title={t("nav.myJobs")} description={t("me.closeHint")} />
      {!current ? (
        <section className="ui-card">
          <p className="text-sm text-[var(--muted)]">{t("me.noJobs")}</p>
        </section>
      ) : (
        <section className="ui-card p-4">
          <h2 className="text-sm font-semibold">{t("me.currentJob")}</h2>
          <p className="mt-1 text-sm font-medium">
            {product?.product.name ?? "—"} · {current.job.order.customer.name}
          </p>
          <p className="mt-1 text-sm text-[var(--text-muted)]">
            {t("orders.plan")}: {qtyDisplay(current.batch.plannedQty)} {unit}
            {" · "}
            {t("home.col.fact")}: {qtyDisplay(current.job.producedQty)} / {qtyDisplay(current.job.plannedQty)} {unit}
          </p>
          <div className="mt-3 h-2 overflow-hidden rounded-full bg-[var(--surface-muted)]">
            <div className="h-full rounded-full bg-[var(--color-gold)]" style={{ width: `${pct}%` }} />
          </div>
          <CloseBatchForm
            batchId={current.batch.id}
            plannedQty={current.batch.plannedQty}
            materials={current.batch.materials}
            unit={unit}
            t={t}
          />
          <Link href={`/production/${current.job.id}`} className="mt-3 inline-block text-sm text-[var(--titan-dark)]">
            {t("prod.openOrder")}
          </Link>
        </section>
      )}
      {jobs.length > 1 ? (
        <section className="ui-card">
          <h2 className="text-sm font-semibold">{t("dash.openJobs")}</h2>
          <ul className="mt-2 space-y-1 text-sm">
            {jobs.map((j) => (
              <li key={j.id}>
                <Link href={`/production/${j.id}`} className="hover:underline">
                  {j.order.items[0]?.product.name ?? "—"} · {j.order.customer.name}
                </Link>
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </div>
  );
}
