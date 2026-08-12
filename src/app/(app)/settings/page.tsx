import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/authz";
import { DEFAULT_SETTINGS, SETTING_KEYS } from "@/lib/settings";
import { renameLeadStage, renameOrderStatus, updateBusinessSettings } from "@/app/actions/settings";
import Link from "next/link";

function asString(value: unknown, fallback: string) {
  return typeof value === "string" ? value : fallback;
}

export default async function SettingsPage() {
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
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Настройки</h1>
        <p className="mt-1 text-sm text-slate-600">Параметры предприятия без изменения кода.</p>
      </div>

      <div className="flex flex-wrap gap-2 text-sm">
        <Link className="rounded-full bg-teal-800 px-3 py-1 text-white" href="/settings">
          Бизнес
        </Link>
        <Link className="rounded-full bg-white px-3 py-1 ring-1 ring-slate-200" href="/settings/units">
          Единицы
        </Link>
        <Link className="rounded-full bg-white px-3 py-1 ring-1 ring-slate-200" href="/settings/users">
          Пользователи
        </Link>
        <Link className="rounded-full bg-white px-3 py-1 ring-1 ring-slate-200" href="/settings/roles">
          Роли
        </Link>
        <Link className="rounded-full bg-white px-3 py-1 ring-1 ring-slate-200" href="/settings/approvals">
          Согласования
        </Link>
        <Link className="rounded-full bg-white px-3 py-1 ring-1 ring-slate-200" href="/settings/audit">
          Журнал
        </Link>
        <Link className="rounded-full bg-white px-3 py-1 ring-1 ring-slate-200" href="/employees">
          Сотрудники
        </Link>
        <Link className="rounded-full bg-white px-3 py-1 ring-1 ring-slate-200" href="/products">
          Продукция
        </Link>
        <Link className="rounded-full bg-white px-3 py-1 ring-1 ring-slate-200" href="/settings/backups">
          Резервные копии
        </Link>
      </div>

      <form action={updateBusinessSettings} className="max-w-xl space-y-4 rounded-2xl border border-[var(--line)] bg-white p-6">
        <Field name="companyName" label="Название предприятия" defaultValue={values.companyName} disabled={!canEdit} />
        <Field name="logoUrl" label="Логотип (URL)" defaultValue={values.logoUrl} disabled={!canEdit} />
        <Field name="currencyCode" label="Валюта (код)" defaultValue={values.currencyCode} disabled={!canEdit} />
        <Field name="currencyName" label="Валюта (название)" defaultValue={values.currencyName} disabled={!canEdit} />
        <Field name="timezone" label="Часовой пояс" defaultValue={values.timezone} disabled={!canEdit} />
        <Field
          name="discountLimitPercent"
          label="Лимит скидки менеджера, %"
          defaultValue={values.discountLimitPercent}
          disabled={!canEdit}
        />
        <Field
          name="opexReservePercent"
          label="Резерв постоянных расходов с оплаты, %"
          defaultValue={values.opexReservePercent}
          disabled={!canEdit}
        />
        {canEdit ? (
          <button type="submit" className="rounded-lg bg-teal-800 px-4 py-2 text-sm font-medium text-white">
            Сохранить
          </button>
        ) : null}
      </form>

      <section className="rounded-2xl border border-[var(--line)] bg-white p-5">
        <h2 className="text-sm font-semibold">Статусы заказа</h2>
        <ul className="mt-3 space-y-2">
          {orderStatuses.map((s) => (
            <li key={s.id}>
              <form action={renameOrderStatus} className="flex flex-wrap items-center gap-2 text-sm">
                <input type="hidden" name="id" value={s.id} />
                <span className="w-40 text-xs text-slate-500">{s.code}</span>
                <input
                  name="name"
                  defaultValue={s.name}
                  disabled={!canEdit}
                  className="rounded-lg border border-slate-200 px-2 py-1 text-sm"
                />
                {canEdit ? (
                  <button className="text-xs text-teal-800 hover:underline">Сохранить</button>
                ) : null}
              </form>
            </li>
          ))}
        </ul>
      </section>

      <section className="rounded-2xl border border-[var(--line)] bg-white p-5">
        <h2 className="text-sm font-semibold">Этапы воронки</h2>
        <ul className="mt-3 space-y-2">
          {leadStages.map((s) => (
            <li key={s.id}>
              <form action={renameLeadStage} className="flex flex-wrap items-center gap-2 text-sm">
                <input type="hidden" name="id" value={s.id} />
                <span className="w-40 text-xs text-slate-500">{s.code}</span>
                <input
                  name="name"
                  defaultValue={s.name}
                  disabled={!canEdit}
                  className="rounded-lg border border-slate-200 px-2 py-1 text-sm"
                />
                {canEdit ? (
                  <button className="text-xs text-teal-800 hover:underline">Сохранить</button>
                ) : null}
              </form>
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
        className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none ring-teal-700 focus:ring-2 disabled:bg-slate-50"
      />
    </label>
  );
}
