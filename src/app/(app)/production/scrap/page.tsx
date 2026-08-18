import Link from "next/link";
import { prisma } from "@core/infrastructure/prisma";
import { requirePermission } from "@core/auth/authz";
import { qtyDisplay } from "@core/shared/decimal";
import { getTranslator, intlLocale } from "@core/shared/i18n/locale";
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

export default async function ScrapPage() {
  const { t, locale } = await getTranslator();
  await requirePermission("production.view");
  const start = new Date();
  start.setDate(1);
  start.setHours(0, 0, 0, 0);

  const scraps = await prisma.scrapRecord.findMany({
    where: { createdAt: { gte: start } },
    include: {
      batch: {
        include: {
          production: { include: { order: { include: { items: { include: { product: { include: { outputUnit: true } } } } } } } },
        },
      },
    },
    orderBy: { createdAt: "desc" },
    take: 50,
  });

  const loc = intlLocale(locale);

  return (
    <div className="page-stack">
      <PageHeader title={t("nav.scrap")} description={t("prod.scrapHint")} />
      <DashPanel title={t("nav.scrap")}>
        {scraps.length === 0 ? (
          <DataListEmpty>{t("an.noScrap")}</DataListEmpty>
        ) : (
          <DataList layout="cols3">
            <DataListHead layout="cols3">
              <DataListHeadCell>{t("common.product")}</DataListHeadCell>
              <DataListHeadCell>{t("list.col.when")}</DataListHeadCell>
              <DataListHeadCell align="right">{t("common.qty")}</DataListHeadCell>
            </DataListHead>
            <ul className={dataListStyles.rows}>
              {scraps.map((s) => {
                const product = s.batch.production.order.items[0]?.product;
                const unitSymbol = product?.outputUnit?.symbol ?? t("common.unitGeneric");
                return (
                  <DataListRow key={s.id} layout="cols3">
                    <DataListPrimary
                      title={product?.name ?? "—"}
                      subtitle={s.reason}
                      href={`/production/${s.batch.productionOrderId}`}
                    />
                    <DataListCell label={t("list.col.when")}>
                      {s.createdAt.toLocaleDateString(loc)}
                    </DataListCell>
                    <DataListCell label={t("common.qty")} align="right">
                      <span className="font-mono text-xs tabular-nums">
                        {qtyDisplay(s.quantity)} {unitSymbol}
                      </span>
                    </DataListCell>
                  </DataListRow>
                );
              })}
            </ul>
          </DataList>
        )}
      </DashPanel>
    </div>
  );
}
