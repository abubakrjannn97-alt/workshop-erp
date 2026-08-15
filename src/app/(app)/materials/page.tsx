import { PageHeader } from "@/components/page-header";
import { FormField } from "@/components/form-field";
import { getTranslator } from "@/lib/locale";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/authz";
import { CatalogNav } from "@/components/catalog-nav";
import { createMaterial, archiveMaterial } from "@/app/actions/materials";
import { moneyDisplay, qtyDisplay } from "@/lib/decimal";
import { unitCost } from "@/lib/costing";

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
        <form action={createMaterial} className="grid gap-3 ui-card p-4 sm:grid-cols-2 lg:grid-cols-4">
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
          <button className="ui-btn-primary sm:col-span-2 lg:col-span-4">
            {t("materials.add")}
          </button>
        </form>
      ) : null}

      <div className="overflow-hidden ui-card">
        <table className="w-full text-left text-sm">
          <thead className="bg-[var(--surface-muted)] text-xs uppercase tracking-wide text-[var(--muted)]">
            <tr>
              <th className="px-4 py-3">{t("common.material")}</th>
              <th className="px-4 py-3">{t("materials.pack")}</th>
              <th className="px-4 py-3">{t("materials.packPriceCol")}</th>
              <th className="px-4 py-3">{t("materials.perUnit")}</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody>
            {materials.map((material) => {
              const cost = unitCost(material.packagePrice, material.packageWeight);
              return (
                <tr key={material.id} className="border-t border-[var(--line)]">
                  <td className="px-4 py-3">
                    <Link href={`/materials/${material.id}`} className="font-medium text-[var(--titan-dark)] hover:underline">
                      {material.name}
                    </Link>
                    <p className="text-xs text-[var(--muted)]">{material.category}</p>
                  </td>
                  <td className="px-4 py-3 text-xs">
                    {qtyDisplay(material.packageWeight)} {material.storageUnit.symbol}
                  </td>
                  <td className="px-4 py-3 font-mono text-xs">{moneyDisplay(material.packagePrice)} с</td>
                  <td className="px-4 py-3 font-mono text-xs">
                    {cost ? `${moneyDisplay(cost)} с / ${material.storageUnit.symbol}` : "—"}
                  </td>
                  <td className="px-4 py-3 text-right">
                    {canManage ? (
                      <form action={archiveMaterial}>
                        <input type="hidden" name="id" value={material.id} />
                        <button className="text-xs text-[var(--danger)]">{t("common.archive")}</button>
                      </form>
                    ) : null}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
