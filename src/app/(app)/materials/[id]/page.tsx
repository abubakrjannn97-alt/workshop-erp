import { PageHeader } from "@/components/page-header";
import { DashPanel } from "@/components/dash-panel";
import { FormField } from "@/components/form-field";
import { getTranslator, intlLocale } from "@core/shared/i18n/locale";
import { notFound } from "next/navigation";
import { prisma } from "@core/infrastructure/prisma";
import { requirePermission } from "@core/auth/authz";
import { updateMaterial } from "@/app/actions/materials";
import { CatalogNav } from "@/components/catalog-nav";
import { moneyDisplay, qtyDisplay } from "@core/shared/decimal";
import { unitCost } from "@core/costing/costing";
import { PendingButton } from "@/components/pending-button";

export default async function MaterialDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { t, locale } = await getTranslator();
  const { id } = await params;
  const session = await requirePermission("materials.view");
  const canManage =
    session.user.roleCode === "owner" || session.user.permissions.includes("materials.manage");

  const [material, units] = await Promise.all([
    prisma.material.findUnique({
      where: { id },
      include: {
        storageUnit: true,
        purchaseUnit: true,
        prices: { orderBy: { validFrom: "desc" } },
      },
    }),
    prisma.unit.findMany({ where: { archivedAt: null, isActive: true }, orderBy: { name: "asc" } }),
  ]);
  if (!material || material.archivedAt) notFound();

  const cost = unitCost(material.packagePrice, material.packageWeight);

  return (
    <div className="page-stack">
      <PageHeader
        title={material.name}
        description={
          cost
            ? `${t("materials.calcCost")}: ${moneyDisplay(cost)} с / ${material.storageUnit.symbol}`
            : t("materials.notSet")
        }
      />
      <CatalogNav current="materials" locale={locale} />

      <DashPanel title={t("materials.savePriceHist")}>
        <form action={updateMaterial} className="grid gap-3 sm:grid-cols-2">
          <input type="hidden" name="id" value={material.id} />
          <FormField label={t("common.name")}>
            <input name="name" defaultValue={material.name} disabled={!canManage} className="ui-input" />
          </FormField>
          <FormField label={t("common.category")}>
            <input name="category" defaultValue={material.category} disabled={!canManage} className="ui-input" />
          </FormField>
          <FormField label={t("common.supplier")}>
            <input name="supplierName" defaultValue={material.supplierName ?? ""} disabled={!canManage} className="ui-input" />
          </FormField>
          <FormField label={t("materials.storageUnit")}>
            <select name="storageUnitId" defaultValue={material.storageUnitId} disabled={!canManage} className="ui-input">
              {units.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.name} ({u.symbol})
                </option>
              ))}
            </select>
          </FormField>
          <FormField label={t("materials.purchaseUnit")}>
            <select name="purchaseUnitId" defaultValue={material.purchaseUnitId} disabled={!canManage} className="ui-input">
              {units.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.name} ({u.symbol})
                </option>
              ))}
            </select>
          </FormField>
          <FormField label={t("materials.packVolume")}>
            <input name="packageWeight" defaultValue={material.packageWeight.toString()} disabled={!canManage} className="ui-input" />
          </FormField>
          <FormField label={t("materials.packPriceSom")}>
            <input name="packagePrice" defaultValue={material.packagePrice.toString()} disabled={!canManage} className="ui-input" />
          </FormField>
          <FormField label={t("materials.minQty")}>
            <input name="minStock" defaultValue={material.minStock.toString()} disabled={!canManage} className="ui-input" />
          </FormField>
          {canManage ? (
            <PendingButton className="ui-btn-primary min-h-[44px] sm:col-span-2" pendingLabel={t("common.sending")}>
              {t("materials.savePriceHist")}
            </PendingButton>
          ) : null}
        </form>
      </DashPanel>

      <DashPanel title={t("materials.priceHistory")}>
        <ul className="space-y-2 text-sm">
          {material.prices.map((row) => (
            <li key={row.id} className="flex justify-between gap-4">
              <span>
                {row.validFrom.toLocaleDateString(intlLocale(locale))}
                {row.validTo ? ` — ${row.validTo.toLocaleDateString(intlLocale(locale))}` : ` — ${t("common.active")}`} · {t("materials.packShort")}{" "}
                {qtyDisplay(row.packageWeight)} / {moneyDisplay(row.packagePrice)} с
              </span>
              <span className="font-mono text-xs">{moneyDisplay(row.unitPrice)} {t("materials.perUnitShort")}</span>
            </li>
          ))}
        </ul>
      </DashPanel>
    </div>
  );
}
