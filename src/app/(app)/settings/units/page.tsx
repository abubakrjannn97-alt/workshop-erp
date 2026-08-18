import { getTranslator } from "@core/shared/i18n/locale";
import { prisma } from "@core/infrastructure/prisma";
import { requirePermission } from "@core/auth/authz";
import { archiveUnit, createUnit, updateUnit } from "@/app/actions/units";
import { PageHeader } from "@/components/page-header";
import { FormField } from "@/components/form-field";
import { SettingsNav } from "@/components/settings-nav";
import { DataTableSection, UiTable } from "@/components/data-table";

function unitCategories(t: (k: string) => string) {
  return [
    { value: "mass", label: t("set.cat.mass") },
    { value: "area", label: t("set.cat.area") },
    { value: "count", label: t("set.cat.count") },
    { value: "length", label: t("set.cat.length") },
    { value: "volume", label: t("set.cat.volume") },
    { value: "other", label: t("set.cat.other") },
  ];
}

export default async function UnitsPage() {
  const { t, n, locale } = await getTranslator();
  const session = await requirePermission("units.view");
  const canManage =
    session.user.roleCode === "owner" || session.user.permissions.includes("units.manage");
  const units = await prisma.unit.findMany({
    where: { archivedAt: null },
    orderBy: [{ category: "asc" }, { name: "asc" }],
  });

  return (
    <div className="page-stack">
      <PageHeader title={t("set.unitsTitle")} description={t("set.unitsHint")} />
      <SettingsNav current="units" locale={locale} />

      {canManage ? (
        <form action={createUnit} className="ui-card flex flex-wrap items-end gap-2 p-3">
            <FormField label={t("set.unitCode")} className="min-w-[6rem] flex-1">
              <input name="code" placeholder={t("set.unitCodePh")} className="ui-input" required />
            </FormField>
            <FormField label={t("set.unitName")} className="min-w-[8rem] flex-1">
              <input name="name" placeholder={t("common.name")} className="ui-input" required />
            </FormField>
            <FormField label={t("set.unitSymbol")} className="min-w-[5rem]">
              <input name="symbol" placeholder="кг" className="ui-input" required />
            </FormField>
            <FormField label={t("set.unitCategory")} className="min-w-[8rem]">
              <select name="category" className="ui-input">
                {unitCategories(t).map((c) => (
                  <option key={c.value} value={c.value}>
                    {c.label}
                  </option>
                ))}
              </select>
            </FormField>
            <FormField label={t("set.toBase")} hint={t("set.toBaseHint")} className="min-w-[6rem]">
              <input name="toBaseFactor" defaultValue="1" inputMode="decimal" className="ui-input" />
            </FormField>
            <div className="flex items-end">
              <button type="submit" className="ui-btn-primary min-h-[44px]">
                {t("common.add")}
              </button>
            </div>
          <FormField label={t("set.baseUnit")} className="w-full">
            <input type="checkbox" name="isBase" className="mt-1" />
          </FormField>
        </form>
      ) : null}

      <DataTableSection>
        <UiTable>
          <table className="w-full min-w-[720px] text-left text-sm">
            <thead className="bg-[var(--surface-muted)] text-xs uppercase tracking-wide text-[var(--muted)]">
              <tr>
                <th className="px-4 py-3">{t("common.code")}</th>
                <th className="px-4 py-3">{t("set.unitName")}</th>
                <th className="px-4 py-3">{t("set.unitSymbol")}</th>
                <th className="px-4 py-3">{t("set.unitCategory")}</th>
                <th className="px-4 py-3">{t("set.toBase")}</th>
                {canManage ? <th className="px-4 py-3" /> : null}
              </tr>
            </thead>
            <tbody>
              {units.map((unit) => {
                const formId = `unit-${unit.id}`;
                return (
                  <tr key={unit.id} className="border-t border-[var(--line)]">
                    <td className="px-4 py-3 font-mono text-xs" data-label={t("common.code")}>
                      {unit.code}
                      {canManage ? (
                        <>
                          <input type="hidden" form={formId} name="id" value={unit.id} />
                          <input type="hidden" form={formId} name="category" value={unit.category} />
                          {unit.isBase ? <input type="hidden" form={formId} name="isBase" value="on" /> : null}
                        </>
                      ) : null}
                    </td>
                    <td className="px-4 py-3" data-label={t("set.unitName")}>
                      {canManage ? (
                        <input form={formId} name="name" defaultValue={unit.name} className="ui-input min-w-[8rem]" />
                      ) : (
                        n("unit", unit.code, unit.name)
                      )}
                    </td>
                    <td className="px-4 py-3" data-label={t("set.unitSymbol")}>
                      {canManage ? (
                        <input form={formId} name="symbol" defaultValue={unit.symbol} className="ui-input w-24" />
                      ) : (
                        unit.symbol
                      )}
                    </td>
                    <td className="px-4 py-3" data-label={t("set.unitCategory")}>
                      {t(`set.cat.${unit.category}`)}
                    </td>
                    <td className="px-4 py-3" data-label={t("set.toBase")}>
                      {canManage ? (
                        <input
                          form={formId}
                          name="toBaseFactor"
                          defaultValue={String(unit.toBaseFactor).replace(/\.?0+$/, "") || "0"}
                          inputMode="decimal"
                          className="ui-input w-28"
                        />
                      ) : (
                        <span className="font-mono text-xs">{String(unit.toBaseFactor).replace(/\.?0+$/, "") || "0"}</span>
                      )}
                    </td>
                    {canManage ? (
                      <td className="px-4 py-3">
                        <div className="flex flex-wrap items-center gap-2">
                          <form id={formId} action={updateUnit}>
                            <button type="submit" className="ui-btn-primary min-h-[44px] px-3 text-xs">
                              {t("common.save")}
                            </button>
                          </form>
                          <form action={archiveUnit}>
                            <input type="hidden" name="id" value={unit.id} />
                            <button type="submit" className="min-h-[44px] text-xs text-[var(--danger)]">
                              {t("common.archive")}
                            </button>
                          </form>
                        </div>
                      </td>
                    ) : null}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </UiTable>
      </DataTableSection>
    </div>
  );
}
