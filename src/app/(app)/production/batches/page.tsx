import { prisma } from "@core/infrastructure/prisma";
import { requirePermission } from "@core/auth/authz";
import { qtyDisplay } from "@core/shared/decimal";
import { getTranslator } from "@core/shared/i18n/locale";
import { PageHeader } from "@/components/page-header";
import { DashPanel } from "@/components/dash-panel";
import {
  DataList,
  DataListCell,
  DataListEmpty,
  DataListHead,
  DataListHeadCell,
  DataListPrimary,
  DataListRow,
  dataListStyles,
} from "@/components/data-table";

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
      <DashPanel title={t("nav.batches")}>
        {batches.length === 0 ? (
          <DataListEmpty>{t("prod.noBatches")}</DataListEmpty>
        ) : (
          <DataList layout="cols3">
            <DataListHead layout="cols3">
              <DataListHeadCell>{t("prod.batch")}</DataListHeadCell>
              <DataListHeadCell>{t("common.product")}</DataListHeadCell>
              <DataListHeadCell align="right">{t("orders.plan")}</DataListHeadCell>
            </DataListHead>
            <ul className={dataListStyles.rows}>
              {batches.map((b) => (
                <DataListRow key={b.id} layout="cols3">
                  <DataListPrimary
                    title={`№${b.number} · ${b.production.order.customer.name}`}
                    href={`/production/${b.productionOrderId}`}
                  />
                  <DataListCell label={t("common.product")}>
                    {b.production.order.items[0]?.product.name ?? "—"}
                  </DataListCell>
                  <DataListCell label={t("orders.plan")} align="right">
                    <span className="font-mono text-xs tabular-nums">{qtyDisplay(b.plannedQty)}</span>
                  </DataListCell>
                </DataListRow>
              ))}
            </ul>
          </DataList>
        )}
      </DashPanel>
    </div>
  );
}
