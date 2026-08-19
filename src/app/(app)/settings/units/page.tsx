import { getTranslator } from "@core/shared/i18n/locale";
import { prisma } from "@core/infrastructure/prisma";
import { requirePermission } from "@core/auth/authz";
import { archiveUnit, createUnit, updateUnit } from "@/app/actions/units";
import { FormField } from "@/components/form-field";
import { SettingsNav } from "@/components/settings-nav";
import styles from "@/styles/premium.module.css";

function unitCategories(t: (k: string) => string) {
  return [
    { value: "mass", label: t("set.cat.mass") }, { value: "area", label: t("set.cat.area") },
    { value: "count", label: t("set.cat.count") }, { value: "length", label: t("set.cat.length") },
    { value: "volume", label: t("set.cat.volume") }, { value: "other", label: t("set.cat.other") },
  ];
}

export default async function UnitsPage() {
  const { t, n, locale } = await getTranslator();
  const session = await requirePermission("units.view");
  const canManage = session.user.roleCode === "owner" || session.user.permissions.includes("units.manage");
  const units = await prisma.unit.findMany({ where: { archivedAt: null }, orderBy: [{ category: "asc" }, { name: "asc" }] });

  return (
    <div className={styles.page}>
      <header className={styles.header}><div className={styles.headerText}><h1 className={styles.title}>{t("set.unitsTitle")}</h1><p className={styles.subtitle}>{t("set.unitsHint")}</p></div></header>
      <SettingsNav current="units" locale={locale} />

      {canManage ? (
        <section className={styles.section}>
          <div className={styles.sectionHead}><h2 className={styles.sectionTitle}>{t("common.add")}</h2></div>
          <div className={styles.sectionBody}>
            <form action={createUnit} className="flex flex-wrap items-end gap-2">
              <FormField label={t("set.unitCode")} className="min-w-[6rem] flex-1"><input name="code" placeholder={t("set.unitCodePh")} className="ui-input" required /></FormField>
              <FormField label={t("set.unitName")} className="min-w-[8rem] flex-1"><input name="name" placeholder={t("common.name")} className="ui-input" required /></FormField>
              <FormField label={t("set.unitSymbol")} className="min-w-[5rem]"><input name="symbol" placeholder="кг" className="ui-input" required /></FormField>
              <FormField label={t("set.unitCategory")} className="min-w-[8rem]"><select name="category" className="ui-input">{unitCategories(t).map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}</select></FormField>
              <FormField label={t("set.toBase")} hint={t("set.toBaseHint")} className="min-w-[6rem]"><input name="toBaseFactor" defaultValue="1" inputMode="decimal" className="ui-input" /></FormField>
              <div className="flex items-end"><button type="submit" className="ui-btn-primary min-h-[44px]">{t("common.add")}</button></div>
              <FormField label={t("set.baseUnit")} className="w-full"><input type="checkbox" name="isBase" className="mt-1" /></FormField>
            </form>
          </div>
        </section>
      ) : null}

      <section className={styles.section}>
        <div className={styles.sectionHead}><h2 className={styles.sectionTitle}>{t("set.unitsTitle")}</h2></div>
        <div className={styles.tableWrap}>
          <table className={styles.table} style={{ minWidth: 720 }}>
            <thead><tr>
              <th>{t("common.code")}</th><th>{t("set.unitName")}</th><th>{t("set.unitSymbol")}</th>
              <th>{t("set.unitCategory")}</th><th>{t("set.toBase")}</th>{canManage ? <th /> : null}
            </tr></thead>
            <tbody>
              {units.map((unit) => {
                const formId = `unit-${unit.id}`;
                return (
                  <tr key={unit.id}>
                    <td style={{ fontFamily: "var(--font-mono)", fontSize: 12 }}>
                      {unit.code}
                      {canManage ? (<><input type="hidden" form={formId} name="id" value={unit.id} /><input type="hidden" form={formId} name="category" value={unit.category} />{unit.isBase ? <input type="hidden" form={formId} name="isBase" value="on" /> : null}</>) : null}
                    </td>
                    <td>{canManage ? <input form={formId} name="name" defaultValue={unit.name} className="ui-input min-w-[8rem]" /> : n("unit", unit.code, unit.name)}</td>
                    <td>{canManage ? <input form={formId} name="symbol" defaultValue={unit.symbol} className="ui-input w-24" /> : unit.symbol}</td>
                    <td>{t(`set.cat.${unit.category}`)}</td>
                    <td>{canManage ? <input form={formId} name="toBaseFactor" defaultValue={String(unit.toBaseFactor).replace(/\.?0+$/, "") || "0"} inputMode="decimal" className="ui-input w-28" /> : <span style={{ fontFamily: "var(--font-mono)", fontSize: 12 }}>{String(unit.toBaseFactor).replace(/\.?0+$/, "") || "0"}</span>}</td>
                    {canManage ? (
                      <td>
                        <div className="flex flex-wrap items-center gap-2">
                          <form id={formId} action={updateUnit}><button type="submit" className="ui-btn-primary min-h-[44px] px-3 text-xs">{t("common.save")}</button></form>
                          <form action={archiveUnit}><input type="hidden" name="id" value={unit.id} /><button type="submit" className={styles.dangerBtn}>{t("common.archive")}</button></form>
                        </div>
                      </td>
                    ) : null}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
