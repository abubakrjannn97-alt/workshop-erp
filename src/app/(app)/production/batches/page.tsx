import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/authz";
import { qtyDisplay } from "@core/shared/decimal";
import { getTranslator } from "@/lib/locale";
import { PageHeader } from "@/components/page-header";

export default async function BatchesPage() {
  const { t } = await getTranslator();
  await requirePermission("production.view");
  const batches = await prisma.productionBatch.findMany({
    where: { status: "OPEN" },
    include: {
      production: { include: { order: { include: { customer: true, items: { include: { product: true } } } } } },
    },
    orderBy: { createdAt: "desc" },
  });

  return (
    <div className="page-stack">
      <PageHeader title={t("nav.batches")} description={t("prod.batchesHint")} />
      {batches.length === 0 ? (
        <p className="text-sm text-[var(--muted)]">{t("prod.noBatches")}</p>
      ) : (
        <ul className="space-y-2">
          {batches.map((b) => (
            <li key={b.id} className="ui-card px-4 py-3 text-sm">
              <Link href={`/production/${b.productionOrderId}`} className="font-medium hover:underline">
                {t("prod.batch")} №{b.number} · {b.production.order.customer.name}
              </Link>
              <p className="mt-1 text-[12px] text-[var(--muted)]">
                {b.production.order.items[0]?.product.name ?? "—"} · {t("orders.plan")} {qtyDisplay(b.plannedQty)}
              </p>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
