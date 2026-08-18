import { PageHeader } from "@/components/page-header";
import { DashPanel } from "@/components/dash-panel";
import { FormField } from "@/components/form-field";
import { getTranslator, intlLocale } from "@core/shared/i18n/locale";
import { prisma } from "@core/infrastructure/prisma";
import { requirePermission } from "@core/auth/authz";
import { WarehouseNav } from "@/components/warehouse-nav";
import { createInventoryCount } from "@/app/actions/inventory";
import { PendingButton } from "@/components/pending-button";
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
import { StatusBadge, type BadgeTone } from "@/components/status-badge";

function countTone(status: string): BadgeTone {
  if (status === "POSTED") return "good";
  return "warn";
}

export default async function InventoryListPage() {
  const { t, locale, n } = await getTranslator();
  const session = await requirePermission("inventory.count");
  const warehouses = await prisma.warehouse.findMany({ orderBy: { name: "asc" } });
  const counts = await prisma.inventoryCount.findMany({
    orderBy: { createdAt: "desc" },
    include: { warehouse: true },
    take: 50,
  });

  return (
    <div className="page-stack">
      <PageHeader title={t("wh.invTitle")} description={t("wh.invHint")} />
      <WarehouseNav current="inventory" locale={locale} />

      <DashPanel title={t("wh.startCount")}>
        <form action={createInventoryCount} className="flex flex-wrap items-end gap-3">
          <FormField label={t("page.warehouse")} className="min-w-[12rem] flex-1">
            <select name="warehouseId" className="ui-input">
              {warehouses.map((w) => (
                <option key={w.id} value={w.id}>
                  {w.name}
                </option>
              ))}
            </select>
          </FormField>
          <PendingButton className="ui-btn-primary min-h-[44px]" pendingLabel={t("common.sending")}>
            {t("wh.startCount")}
          </PendingButton>
        </form>
      </DashPanel>

      <DataTableSection>
        {counts.length === 0 ? (
          <DataListEmpty>{t("common.empty")}</DataListEmpty>
        ) : (
          <DataList layout="cols3">
            <DataListHead layout="cols3">
              <DataListHeadCell>{t("page.warehouse")}</DataListHeadCell>
              <DataListHeadCell>{t("wh.time")}</DataListHeadCell>
              <DataListHeadCell>{t("common.status")}</DataListHeadCell>
            </DataListHead>
            <ul className={dataListStyles.rows}>
              {counts.map((c) => (
                <DataListRow key={c.id} layout="cols3">
                  <DataListPrimary
                    title={n("wh", c.warehouse.code, c.warehouse.name)}
                    href={`/warehouse/inventory/${c.id}`}
                  />
                  <DataListCell label={t("wh.time")}>
                    {c.createdAt.toLocaleString(intlLocale(locale))}
                  </DataListCell>
                  <DataListCell label={t("common.status")}>
                    <StatusBadge
                      label={c.status === "DRAFT" ? t("wh.draft") : t("wh.posted")}
                      tone={countTone(c.status)}
                    />
                  </DataListCell>
                </DataListRow>
              ))}
            </ul>
          </DataList>
        )}
      </DataTableSection>

      <p className="hidden">{session.user.id}</p>
    </div>
  );
}
