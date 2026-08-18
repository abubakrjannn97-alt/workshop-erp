import { PageHeader } from "@/components/page-header";
import { DashPanel } from "@/components/dash-panel";
import { FormField } from "@/components/form-field";
import { getTranslator } from "@core/shared/i18n/locale";
import { prisma } from "@core/infrastructure/prisma";
import { requirePermission } from "@core/auth/authz";
import { CatalogNav } from "@/components/catalog-nav";
import { createMaterial, archiveMaterial } from "@/app/actions/materials";
import { moneyDisplay, qtyDisplay } from "@core/shared/decimal";
import { unitCost } from "@core/costing/costing";
import { PendingButton } from "@/components/pending-button";
import {
  DataList,
  DataListCell,
  DataListEmpty,
  DataListHead,
  DataListHeadCell,
  DataListMetric,
  DataListPrimary,
  DataListRow,
  DataTableSection,
  dataListStyles,
} from "@/components/data-table";

export default async function MaterialsPage() {
  const { t, locale } = await getTranslator();
  const session = await requirePermission("materials.view");
  const canManage =
    session.user.roleCode === "owner" || session.user.permissions.includes("materials.manage");

  const [materials, units] = await Promise.all([
    prisma.material.findMany({
      where: { archivedAt: null },
      include: { storageUnit: true, purchaseUnit: true },
      orderBy: { name: "asc" },
    }),
    prisma.unit.findMany({ where: { archivedAt: null, isActive: true }, orderBy: { name: "asc" } }),
  ]);

  return (
    <div className="page-stack">
      <PageHeader title={t("materials.title")} description={t("materials.hint")} />
      <CatalogNav current="materials" locale={locale} />

      {canManage ? (
        <DashPanel title={t("materials.add")}>
          <form action={createMaterial} className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <p className="sm:col-span-2 lg:col-span-4 text-sm text-[var(--text-muted)]">{t("materials.formHint")}</p>
            <FormField label={t("common.name")}>
              <input name="name" required placeholder={t("materials.namePh")} className="ui-input" />
            </FormField>
            <FormField label={t("common.category")}>
              <input name="category" required placeholder={t("materials.categoryPh")} className="ui-input" />
            </FormField>
            <FormField label={t("common.supplier")} hint={t("materials.supplierPh")}>
              <input name="supplierName" placeholder={t("materials.supplierPh")} className="ui-input" />
            </FormField>
            <FormField label={t("materials.storageUnit")} hint={t("materials.storageHint")}>
              <select name="storageUnitId" className="ui-input">
                {units.map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.name} ({u.symbol})
                  </option>
                ))}
              </select>
            </FormField>
            <FormField label={t("materials.purchaseUnit")} hint={t("materials.purchaseHint")}>
              <select name="purchaseUnitId" className="ui-input">
                {units.map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.name} ({u.symbol})
                  </option>
                ))}
              </select>
            </FormField>
            <FormField label={t("materials.packWeight")} hint={t("materials.packWeightHint")}>
              <input name="packageWeight" required inputMode="decimal" placeholder="25" className="ui-input" />
            </FormField>
            <FormField label={t("materials.packPrice")} hint={t("materials.packPriceHint")}>
              <input name="packagePrice" required inputMode="decimal" placeholder="180" className="ui-input" />
            </FormField>
            <FormField label={t("materials.minStock")} hint={t("materials.minStockHint")}>
              <input name="minStock" inputMode="decimal" placeholder="0" defaultValue="0" className="ui-input" />
            </FormField>
            <PendingButton className="ui-btn-primary min-h-[44px] sm:col-span-2 lg:col-span-4" pendingLabel={t("common.sending")}>
              {t("materials.add")}
            </PendingButton>
          </form>
        </DashPanel>
      ) : null}

      <DataTableSection>
        {materials.length === 0 ? (
          <DataListEmpty>{t("common.empty")}</DataListEmpty>
        ) : (
          <DataList layout="cols5">
            <DataListHead layout="cols5">
              <DataListHeadCell>{t("common.material")}</DataListHeadCell>
              <DataListHeadCell>{t("materials.pack")}</DataListHeadCell>
              <DataListHeadCell>{t("materials.packPriceCol")}</DataListHeadCell>
              <DataListHeadCell>{t("materials.perUnit")}</DataListHeadCell>
              <DataListHeadCell align="right">{t("common.actions")}</DataListHeadCell>
            </DataListHead>
            <ul className={dataListStyles.rows}>
              {materials.map((material) => {
                const cost = unitCost(material.packagePrice, material.packageWeight);
                return (
                  <DataListRow key={material.id} layout="cols5">
                    <DataListPrimary
                      title={material.name}
                      subtitle={material.category}
                      href={`/materials/${material.id}`}
                    />
                    <DataListMetric
                      label={t("materials.pack")}
                      value={`${qtyDisplay(material.packageWeight)} ${material.storageUnit.symbol}`}
                    />
                    <DataListMetric label={t("materials.packPriceCol")} value={`${moneyDisplay(material.packagePrice)} с`} />
                    <DataListMetric
                      label={t("materials.perUnit")}
                      value={cost ? `${moneyDisplay(cost)} с / ${material.storageUnit.symbol}` : "—"}
                    />
                    <DataListCell label={t("common.actions")} align="right">
                      {canManage ? (
                        <form action={archiveMaterial}>
                          <input type="hidden" name="id" value={material.id} />
                          <button className="text-xs text-[var(--danger)]">{t("common.archive")}</button>
                        </form>
                      ) : null}
                    </DataListCell>
                  </DataListRow>
                );
              })}
            </ul>
          </DataList>
        )}
      </DataTableSection>
    </div>
  );
}
