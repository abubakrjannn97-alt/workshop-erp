import { getTranslator } from "@core/shared/i18n/locale";
import { prisma } from "@core/infrastructure/prisma";
import { requirePermission } from "@core/auth/authz";
import { DEFAULT_SETTINGS, SETTING_KEYS } from "@core/config/settings";
import { renameLeadStage, renameOrderStatus, updateBusinessSettings } from "@/app/actions/settings";
import { PageHeader } from "@/components/page-header";
import { LogoutButton } from "@/components/logout-button";
import { SettingsNav } from "@/components/settings-nav";
import { DashPanel } from "@/components/dash-panel";
import { FormField } from "@/components/form-field";

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
    discountLimitPercent: asString(
      map[SETTING_KEYS.discountLimitPercent],
      DEFAULT_SETTINGS.discountLimitPercent,
    ),
    opexReservePercent: asString(
      map[SETTING_KEYS.opexReservePercent],
      DEFAULT_SETTINGS.opexReservePercent,
    ),
  };

  const [orderStatuses, leadStages] = await Promise.all([
    prisma.orderStatus.findMany({ orderBy: { sortOrder: "asc" } }),
    prisma.leadStage.findMany({ orderBy: { sortOrder: "asc" } }),
  ]);

  return (
    <div className="page-stack">
      <PageHeader title={t("page.settings")} description={t("set.hint")} />
      <SettingsNav current="business" locale={locale} />

      <DashPanel title={t("set.business")} tour="set-form">
        <form action={updateBusinessSettings} className="grid max-w-xl gap-3">
          <FormField label={t("set.companyName")}>
            <input name="companyName" defaultValue={values.companyName} disabled={!canEdit} className="ui-input" />
          </FormField>
          <FormField label={t("set.logoUrl")}>
            <input name="logoUrl" defaultValue={values.logoUrl} disabled={!canEdit} className="ui-input" />
          </FormField>
          <FormField label={t("set.currencyCode")}>
            <input name="currencyCode" defaultValue={values.currencyCode} disabled={!canEdit} className="ui-input" />
          </FormField>
          <FormField label={t("set.currencyName")}>
            <input name="currencyName" defaultValue={values.currencyName} disabled={!canEdit} className="ui-input" />
          </FormField>
          <FormField label={t("set.timezone")}>
            <input name="timezone" defaultValue={values.timezone} disabled={!canEdit} className="ui-input" />
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
          <FormField label={t("set.expenseReserve")}>
            <input
              name="opexReservePercent"
              defaultValue={values.opexReservePercent}
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
      </DashPanel>

      <DashPanel title={t("set.orderStatuses")}>
        <ul className="space-y-2">
          {orderStatuses.map((s) => (
            <li key={s.id}>
              <form action={renameOrderStatus} className="flex flex-wrap items-center gap-2 text-sm">
                <input type="hidden" name="id" value={s.id} />
                <span className="w-40 shrink-0 font-mono text-xs text-[var(--muted)]">{s.code}</span>
                <input
                  name="name"
                  defaultValue={s.name}
                  disabled={!canEdit}
                  className="ui-input min-w-[10rem] flex-1"
                />
                {canEdit ? (
                  <button type="submit" className="min-h-[44px] text-sm text-[var(--titan-dark)] hover:underline">
                    {t("common.save")}
                  </button>
                ) : null}
              </form>
            </li>
          ))}
        </ul>
      </DashPanel>

      <DashPanel title={t("set.pipelineStages")}>
        <ul className="space-y-2">
          {leadStages.map((s) => (
            <li key={s.id}>
              <form action={renameLeadStage} className="flex flex-wrap items-center gap-2 text-sm">
                <input type="hidden" name="id" value={s.id} />
                <span className="w-40 shrink-0 font-mono text-xs text-[var(--muted)]">{s.code}</span>
                <input
                  name="name"
                  defaultValue={s.name}
                  disabled={!canEdit}
                  className="ui-input min-w-[10rem] flex-1"
                />
                {canEdit ? (
                  <button type="submit" className="min-h-[44px] text-sm text-[var(--titan-dark)] hover:underline">
                    {t("common.save")}
                  </button>
                ) : null}
              </form>
            </li>
          ))}
        </ul>
      </DashPanel>

      <DashPanel title={session.user.name}>
        <p className="text-xs text-[var(--muted)]">{session.user.roleName}</p>
        <LogoutButton label={t("nav.logout")} className="mt-4 min-h-[44px]" />
      </DashPanel>
    </div>
  );
}
