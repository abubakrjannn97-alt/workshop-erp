import { PageHeader } from "@/components/page-header";
import { getTranslator, intlLocale } from "@core/shared/i18n/locale";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@core/auth/authz";
import { updateMaterial } from "@/app/actions/materials";
import { CatalogNav } from "@/components/catalog-nav";
import { moneyDisplay, qtyDisplay } from "@core/shared/decimal";
import { unitCost } from "@core/costing/costing";

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
      <div>
        <PageHeader title={material.name} />
        <p className="text-sm text-[var(--text-muted)]">
          {t("materials.calcCost")}: {cost ? `${moneyDisplay(cost)} с / ${material.storageUnit.symbol}` : t("materials.notSet")}
        </p>
      </div>
      <CatalogNav current="materials" locale={locale} />

      <form action={updateMaterial} className="grid gap-3 ui-card p-4 sm:grid-cols-2">
        <input type="hidden" name="id" value={material.id} />
        <Field name="name" label={t("common.name")} defaultValue={material.name} disabled={!canManage} />
        <Field name="category" label={t("common.category")} defaultValue={material.category} disabled={!canManage} />
        <Field name="supplierName" label={t("common.supplier")} defaultValue={material.supplierName ?? ""} disabled={!canManage} />
        <label className="block text-sm">
          <span className="font-medium">{t("materials.storageUnit")}</span>
          <select name="storageUnitId" defaultValue={material.storageUnitId} disabled={!canManage} className="mt-1 w-full rounded-lg border border-[var(--border)] px-3 py-2 text-sm">
            {units.map((u) => (
              <option key={u.id} value={u.id}>
                {u.name} ({u.symbol})
              </option>
            ))}
          </select>
        </label>
        <label className="block text-sm">
          <span className="font-medium">{t("materials.purchaseUnit")}</span>
          <select name="purchaseUnitId" defaultValue={material.purchaseUnitId} disabled={!canManage} className="mt-1 w-full rounded-lg border border-[var(--border)] px-3 py-2 text-sm">
            {units.map((u) => (
              <option key={u.id} value={u.id}>
                {u.name} ({u.symbol})
              </option>
            ))}
          </select>
        </label>
        <Field name="packageWeight" label={t("materials.packVolume")} defaultValue={material.packageWeight.toString()} disabled={!canManage} />
        <Field name="packagePrice" label={t("materials.packPriceSom")} defaultValue={material.packagePrice.toString()} disabled={!canManage} />
        <Field name="minStock" label={t("materials.minQty")} defaultValue={material.minStock.toString()} disabled={!canManage} />
        {canManage ? (
          <button className="sm:col-span-2 ui-btn-primary">
            {t("materials.savePriceHist")}
          </button>
        ) : null}
      </form>

      <section className="ui-card p-4">
        <h2 className="text-sm font-semibold">{t("materials.priceHistory")}</h2>
        <ul className="mt-3 space-y-2 text-sm">
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
      </section>
    </div>
  );
}

function Field({
  name,
  label,
  defaultValue,
  disabled,
}: {
  name: string;
  label: string;
  defaultValue: string;
  disabled: boolean;
}) {
  return (
    <label className="block text-sm">
      <span className="font-medium">{label}</span>
      <input
        name={name}
        defaultValue={defaultValue}
        disabled={disabled}
        className="mt-1 w-full rounded-lg border border-[var(--border)] px-3 py-2 text-sm disabled:bg-[var(--surface-muted)]"
      />
    </label>
  );
}
