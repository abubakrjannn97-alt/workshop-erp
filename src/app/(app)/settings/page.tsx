import { getTranslator } from "@core/shared/i18n/locale";
import { prisma } from "@core/infrastructure/prisma";
import { requirePermission } from "@core/auth/authz";
import { DEFAULT_SETTINGS, SETTING_KEYS } from "@core/config/settings";
import { renameLeadStage, renameOrderStatus, updateBusinessSettings } from "@/app/actions/settings";
import { LogoutButton } from "@/components/logout-button";
import { SettingsNav } from "@/components/settings-nav";
import { FormField } from "@/components/form-field";
import styles from "@/styles/premium.module.css";

function asString(value: unknown, fallback: string) {
  return typeof value === "string" ? value : fallback;
}

export default async function SettingsPage() {
  const { t, locale } = await getTranslator();
  const session = await requirePermission("settings.view");
  const rows = await prisma.setting.findMany();
  const map = Object.fromEntries(rows.map((r) => [r.key, r.value]));
  const canEdit = session.user.roleCode === "owner" || session.user.permissions.includes("settings.edit");

  const values = {
    companyName: asString(map[SETTING_KEYS.companyName], DEFAULT_SETTINGS.companyName),
    logoUrl: asString(map[SETTING_KEYS.logoUrl], DEFAULT_SETTINGS.logoUrl),
    currencyCode: asString(map[SETTING_KEYS.currencyCode], DEFAULT_SETTINGS.currencyCode),
    currencyName: asString(map[SETTING_KEYS.currencyName], DEFAULT_SETTINGS.currencyName),
    timezone: asString(map[SETTING_KEYS.timezone], DEFAULT_SETTINGS.timezone),
    discountLimitPercent: asString(map[SETTING_KEYS.discountLimitPercent], DEFAULT_SETTINGS.discountLimitPercent),
    opexReservePercent: asString(map[SETTING_KEYS.opexReservePercent], DEFAULT_SETTINGS.opexReservePercent),
  };

  const [orderStatuses, leadStages] = await Promise.all([
    prisma.orderStatus.findMany({ orderBy: { sortOrder: "asc" } }),
    prisma.leadStage.findMany({ orderBy: { sortOrder: "asc" } }),
  ]);

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <div className={styles.headerText}>
          <h1 className={styles.title}>{t("page.settings")}</h1>
          <p className={styles.subtitle}>{t("set.hint")}</p>
        </div>
      </header>
      <SettingsNav current="business" locale={locale} />

      <section className={styles.section} data-tour="set-form">
        <div className={styles.sectionHead}>
          <h2 className={styles.sectionTitle}>{t("set.business")}</h2>
        </div>
        <div className={styles.sectionBody}>
          <form action={updateBusinessSettings} className="grid max-w-xl gap-3">
            <input type="hidden" name="logoUrl" value={values.logoUrl} />
            <input type="hidden" name="timezone" value={values.timezone} />
            <input type="hidden" name="opexReservePercent" value={values.opexReservePercent} />
            <FormField label={t("set.companyName")}>
              <input name="companyName" defaultValue={values.companyName} disabled={!canEdit} className="ui-input" />
            </FormField>
            <FormField label={t("set.currencyName")}>
              <input name="currencyName" defaultValue={values.currencyName} disabled={!canEdit} className="ui-input" />
            </FormField>
            <FormField label={t("set.currencyCode")}>
              <input name="currencyCode" defaultValue={values.currencyCode} disabled={!canEdit} className="ui-input" />
            </FormField>
            <FormField label={t("set.discountLimit")}>
              <input
                name="discountLimitPercent"
                defaultValue={values.discountLimitPercent}
                disabled={!canEdit}
                className="ui-input"
                inputMode="decimal"
              />
            </FormField>
            {canEdit ? (
              <button type="submit" className="ui-btn-primary min-h-[44px]">
                {t("common.save")}
              </button>
            ) : null}
          </form>
        </div>
      </section>

      <section className={styles.section}>
        <div className={styles.sectionHead}>
          <h2 className={styles.sectionTitle}>{t("set.orderStatuses")}</h2>
        </div>
        <div className={styles.sectionBody}>
          <ul style={{ margin: 0, padding: 0, listStyle: "none" }}>
            {orderStatuses.map((s) => (
              <li key={s.id} style={{ padding: "6px 0", borderBottom: "1px solid var(--line)" }}>
                <form action={renameOrderStatus} className="flex flex-wrap items-center gap-2 text-sm">
                  <input type="hidden" name="id" value={s.id} />
                  <input name="name" defaultValue={s.name} disabled={!canEdit} className="ui-input min-w-[10rem] flex-1" />
                  {canEdit ? (
                    <button type="submit" className="min-h-[44px] text-sm font-medium" style={{ color: "var(--accent)" }}>
                      {t("common.save")}
                    </button>
                  ) : null}
                </form>
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section className={styles.section}>
        <div className={styles.sectionHead}>
          <h2 className={styles.sectionTitle}>{t("set.pipelineStages")}</h2>
        </div>
        <div className={styles.sectionBody}>
          <ul style={{ margin: 0, padding: 0, listStyle: "none" }}>
            {leadStages.map((s) => (
              <li key={s.id} style={{ padding: "6px 0", borderBottom: "1px solid var(--line)" }}>
                <form action={renameLeadStage} className="flex flex-wrap items-center gap-2 text-sm">
                  <input type="hidden" name="id" value={s.id} />
                  <input name="name" defaultValue={s.name} disabled={!canEdit} className="ui-input min-w-[10rem] flex-1" />
                  {canEdit ? (
                    <button type="submit" className="min-h-[44px] text-sm font-medium" style={{ color: "var(--accent)" }}>
                      {t("common.save")}
                    </button>
                  ) : null}
                </form>
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section className={styles.section}>
        <div className={styles.sectionHead}>
          <h2 className={styles.sectionTitle}>{session.user.name}</h2>
        </div>
        <div className={styles.sectionBody}>
          <p style={{ fontSize: 12, color: "var(--ink-3)" }}>{session.user.roleName}</p>
          <LogoutButton label={t("nav.logout")} className="mt-4 min-h-[44px]" />
        </div>
      </section>
    </div>
  );
}
