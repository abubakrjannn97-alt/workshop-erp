import { getTranslator } from "@core/shared/i18n/locale";
import { prisma } from "@core/infrastructure/prisma";
import { requirePermission } from "@core/auth/authz";
import { archiveUnit, createUnit, updateUnit } from "@/app/actions/units";
import { FormField } from "@/components/form-field";
import { SettingsNav } from "@/components/settings-nav";
import styles from "@/styles/premium.module.css";

export default async function UnitsPage() {
  const { t, n, locale } = await getTranslator();
  const session = await requirePermission("units.view");
  const canManage = session.user.roleCode === "owner" || session.user.permissions.includes("units.manage");
  const units = await prisma.unit.findMany({
    where: { archivedAt: null },
    orderBy: [{ category: "asc" }, { name: "asc" }],
  });

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <div className={styles.headerText}>
          <h1 className={styles.title}>{t("set.unitsTitle")}</h1>
          <p className={styles.subtitle}>{t("set.unitsHint")}</p>
        </div>
      </header>
      <SettingsNav current="units" locale={locale} />

      {canManage ? (
        <section className={styles.section}>
          <div className={styles.sectionHead}>
            <h2 className={styles.sectionTitle}>{t("common.add")}</h2>
          </div>
          <div className={styles.sectionBody}>
            <form action={createUnit} className="grid gap-3 sm:grid-cols-2">
              <FormField label={t("set.unitName")}>
                <input name="name" placeholder={t("common.name")} className="ui-input" required />
              </FormField>
              <FormField label={t("set.unitSymbol")}>
                <input name="symbol" placeholder="кг" className="ui-input" required />
              </FormField>
              <button type="submit" className="ui-btn-primary min-h-[44px] sm:col-span-2">
                {t("common.add")}
              </button>
            </form>
          </div>
        </section>
      ) : null}

      <section className={styles.section}>
        <div className={styles.sectionHead}>
          <h2 className={styles.sectionTitle}>{t("set.unitsTitle")}</h2>
        </div>
        <div className={styles.sectionBody}>
          <ul style={{ margin: 0, padding: 0, listStyle: "none" }}>
            {units.map((unit) => (
              <li key={unit.id} style={{ padding: "10px 0", borderBottom: "1px solid var(--line)" }}>
                {canManage ? (
                  <div className="flex flex-wrap items-end gap-2">
                    <form action={updateUnit} className="flex flex-wrap items-end gap-2 flex-1">
                      <input type="hidden" name="id" value={unit.id} />
                      <input type="hidden" name="category" value={unit.category} />
                      <input type="hidden" name="toBaseFactor" value={String(unit.toBaseFactor)} />
                      {unit.isBase ? <input type="hidden" name="isBase" value="on" /> : null}
                      <FormField label={t("set.unitName")} className="min-w-[8rem] flex-1">
                        <input name="name" defaultValue={unit.name} className="ui-input" />
                      </FormField>
                      <FormField label={t("set.unitSymbol")} className="min-w-[5rem]">
                        <input name="symbol" defaultValue={unit.symbol} className="ui-input w-24" />
                      </FormField>
                      <button type="submit" className="ui-btn-primary min-h-[44px] px-3 text-xs">
                        {t("common.save")}
                      </button>
                    </form>
                    <form action={archiveUnit}>
                      <input type="hidden" name="id" value={unit.id} />
                      <button type="submit" className={styles.dangerBtn}>
                        {t("common.archive")}
                      </button>
                    </form>
                  </div>
                ) : (
                  <div className="flex min-h-[44px] items-center justify-between gap-3 text-sm">
                    <span>{n("unit", unit.code, unit.name)}</span>
                    <span style={{ color: "var(--ink-3)" }}>{unit.symbol}</span>
                  </div>
                )}
              </li>
            ))}
          </ul>
        </div>
      </section>
    </div>
  );
}
