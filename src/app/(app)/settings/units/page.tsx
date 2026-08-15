import { getTranslator } from "@/lib/locale";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/authz";
import { archiveUnit, createUnit, updateUnit } from "@/app/actions/units";
import { PageHeader } from "@/components/page-header";
import { FormField } from "@/components/form-field";

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
  const { t, n } = await getTranslator();
  const session = await requirePermission("units.view");
  const canManage =
    session.user.roleCode === "owner" || session.user.permissions.includes("units.manage");
  const units = await prisma.unit.findMany({
    where: { archivedAt: null },
    orderBy: [{ category: "asc" }, { name: "asc" }],
  });

  return (
    <div className="page-stack">
      <Header t={t} />
      {canManage ? (
        <form action={createUnit} className="grid gap-3 ui-card p-4 sm:grid-cols-2 lg:grid-cols-6">
          <FormField label={t("set.unitCode")}>
            <input name="code" placeholder={t("set.unitCodePh")} className="ui-input" required />
          </FormField>
          <FormField label={t("set.unitName")}>
            <input name="name" placeholder={t("common.name")} className="ui-input" required />
          </FormField>
          <FormField label={t("set.unitSymbol")}>
            <input name="symbol" placeholder="кг" className="ui-input" required />
          </FormField>
          <FormField label={t("set.unitCategory")}>
            <select name="category" className="ui-input">
              {unitCategories(t).map((c) => (
                <option key={c.value} value={c.value}>
                  {c.label}
                </option>
              ))}
            </select>
          </FormField>
          <FormField label={t("set.toBase")} hint={t("set.toBaseHint")}>
            <input name="toBaseFactor" defaultValue="1" inputMode="decimal" className="ui-input" />
          </FormField>
          <div className="flex items-end">
            <button className="ui-btn-primary w-full">{t("common.add")}</button>
          </div>
          <label className="sm:col-span-2 lg:col-span-6 flex items-center gap-2 text-sm text-[var(--text-muted)]">
            <input type="checkbox" name="isBase" /> {t("set.baseUnit")}
          </label>
        </form>
      ) : null}

      <div className="overflow-x-auto ui-card">
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
                  <td className="px-4 py-3 font-mono text-xs">
                    {unit.code}
                    {canManage ? (
                      <>
                        <input type="hidden" form={formId} name="id" value={unit.id} />
                        <input type="hidden" form={formId} name="category" value={unit.category} />
                        {unit.isBase ? <input type="hidden" form={formId} name="isBase" value="on" /> : null}
                      </>
                    ) : null}
                  </td>
                  <td className="px-4 py-3">
                    {canManage ? (
                      <input
                        form={formId}
                        name="name"
                        defaultValue={unit.name}
                        className="ui-input min-w-[8rem]"
                      />
                    ) : (
                      n("unit", unit.code, unit.name)
                    )}
                  </td>
                  <td className="px-4 py-3">
                    {canManage ? (
                      <input
                        form={formId}
                        name="symbol"
                        defaultValue={unit.symbol}
                        className="ui-input w-24"
                      />
                    ) : (
                      unit.symbol
                    )}
                  </td>
                  <td className="px-4 py-3">{t(`set.cat.${unit.category}`)}</td>
                  <td className="px-4 py-3">
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
                          <button className="ui-btn-primary px-3 py-1 text-xs">{t("common.save")}</button>
                        </form>
                        <form action={archiveUnit}>
                          <input type="hidden" name="id" value={unit.id} />
                          <button className="text-xs text-[var(--danger)]">{t("common.archive")}</button>
                        </form>
                      </div>
                    </td>
                  ) : null}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function Header({ t }: { t: (k: string) => string }) {
  return (
    <div>
      <PageHeader title={t("set.unitsTitle")} description={t("set.unitsHint")} />
      <div className="mt-4 flex flex-wrap gap-1.5">
        <Link className="ui-chip" href="/settings">
          {t("set.business")}
        </Link>
        <Link className="ui-chip-on" href="/settings/units">
          {t("set.units")}
        </Link>
      </div>
    </div>
  );
}
