import { getTranslator } from "@/lib/locale";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/authz";
import { DEFAULT_SETTINGS, SETTING_KEYS } from "@/lib/settings";
import { renameLeadStage, renameOrderStatus, updateBusinessSettings } from "@/app/actions/settings";
import Link from "next/link";
import { PageHeader } from "@/components/page-header";
import { LogoutButton } from "@/components/logout-button";

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

      <div className="flex flex-wrap gap-1.5" data-tour="set-nav">
        <Link className="ui-chip-on" href="/settings">{t("set.business")}</Link>
        <Link className="ui-chip" href="/settings/units">{t("set.units")}</Link>
        <Link className="ui-chip" href="/settings/users">{t("set.users")}</Link>
        <Link className="ui-chip" href="/settings/roles">{t("set.roles")}</Link>
        <Link className="ui-chip" href="/settings/approvals">{t("set.approvals")}</Link>
        <Link className="ui-chip" href="/settings/audit">{t("set.audit")}</Link>
        <Link className="ui-chip" href="/employees">{t("page.employees")}</Link>
        <Link className="ui-chip" href="/products">{t("page.products")}</Link>
        <Link className="ui-chip" href="/settings/backups">{t("set.backupsTitle")}</Link>
      </div>

      <form action={updateBusinessSettings} className="max-w-xl space-y-4 ui-card" data-tour="set-form">
        <Field name="companyName" label={t("set.companyName")} defaultValue={values.companyName} disabled={!canEdit} />
        <Field name="logoUrl" label={t("set.logoUrl")} defaultValue={values.logoUrl} disabled={!canEdit} />
        <Field name="currencyCode" label={t("set.currencyCode")} defaultValue={values.currencyCode} disabled={!canEdit} />
        <Field name="currencyName" label={t("set.currencyName")} defaultValue={values.currencyName} disabled={!canEdit} />
        <Field name="timezone" label={t("set.timezone")} defaultValue={values.timezone} disabled={!canEdit} />
        <Field
          name="discountLimitPercent"
          label={t("set.discountLimit")}
          defaultValue={values.discountLimitPercent}
          disabled={!canEdit}
        />
        <Field
          name="opexReservePercent"
          label={t("set.expenseReserve")}
          defaultValue={values.opexReservePercent}
          disabled={!canEdit}
        />
        {canEdit ? (
          <button type="submit" className="ui-btn-primary">
            {t("common.save")}
          </button>
        ) : null}
      </form>

      <section className="ui-card">
        <h2 className="text-sm font-semibold">{t("set.orderStatuses")}</h2>
        <ul className="mt-3 space-y-2">
          {orderStatuses.map((s) => (
            <li key={s.id}>
              <form action={renameOrderStatus} className="flex flex-wrap items-center gap-2 text-sm">
                <input type="hidden" name="id" value={s.id} />
                <span className="w-40 text-xs text-[var(--muted)]">{s.code}</span>
                <input
                  name="name"
                  defaultValue={s.name}
                  disabled={!canEdit}
                  className="rounded-lg border border-[var(--border)] px-2 py-1 text-sm"
                />
                {canEdit ? (
                  <button className="text-xs text-[var(--titan-dark)] hover:underline">{t("common.save")}</button>
                ) : null}
              </form>
            </li>
          ))}
        </ul>
      </section>

      <section className="ui-card">
        <h2 className="text-sm font-semibold">{t("set.pipelineStages")}</h2>
        <ul className="mt-3 space-y-2">
          {leadStages.map((s) => (
            <li key={s.id}>
              <form action={renameLeadStage} className="flex flex-wrap items-center gap-2 text-sm">
                <input type="hidden" name="id" value={s.id} />
                <span className="w-40 text-xs text-[var(--muted)]">{s.code}</span>
                <input
                  name="name"
                  defaultValue={s.name}
                  disabled={!canEdit}
                  className="rounded-lg border border-[var(--border)] px-2 py-1 text-sm"
                />
                {canEdit ? (
                  <button className="text-xs text-[var(--titan-dark)] hover:underline">{t("common.save")}</button>
                ) : null}
              </form>
            </li>
          ))}
        </ul>
      </section>

      <section className="max-w-xl ui-card p-4">
        <h2 className="text-sm font-semibold">{session.user.name}</h2>
        <p className="mt-1 text-xs text-[var(--muted)]">{session.user.roleName}</p>
        <LogoutButton label={t("nav.logout")} className="mt-4" />
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
        className="mt-1 w-full rounded-lg border border-[var(--border)] px-3 py-2 text-sm outline-none ring-[var(--titan-2)] focus:ring-2 disabled:bg-[var(--surface-muted)]"
      />
    </label>
  );
}
