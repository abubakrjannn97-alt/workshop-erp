import { getTranslator } from "@core/shared/i18n/locale";
import { prisma } from "@core/infrastructure/prisma";
import { requirePermission } from "@core/auth/authz";
import { archiveUser, createUser, updateUser } from "@/app/actions/users";
import { PageHeader } from "@/components/page-header";
import { FormField } from "@/components/form-field";
import { SettingsNav } from "@/components/settings-nav";
import { DashPanel } from "@/components/dash-panel";

export default async function UsersPage() {
  const { t, n, locale } = await getTranslator();
  const session = await requirePermission("users.view");
  const canCreate =
    session.user.roleCode === "owner" || session.user.permissions.includes("users.create");
  const canEdit =
    session.user.roleCode === "owner" || session.user.permissions.includes("users.edit");
  const canArchive =
    session.user.roleCode === "owner" || session.user.permissions.includes("users.archive");

  const [users, roles] = await Promise.all([
    prisma.user.findMany({
      where: { archivedAt: null },
      include: { role: true },
      orderBy: { createdAt: "asc" },
    }),
    prisma.role.findMany({ where: { archivedAt: null }, orderBy: { name: "asc" } }),
  ]);

  return (
    <div className="page-stack">
      <PageHeader title={t("set.users")} description={t("set.usersHint")} />
      <SettingsNav current="users" locale={locale} />

      {canCreate ? (
        <DashPanel title={t("set.createUser")}>
          <form action={createUser} className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            <FormField label={t("set.userName")}>
              <input name="name" required placeholder={t("set.userName")} className="ui-input" />
            </FormField>
            <FormField label={t("set.userEmail")}>
              <input name="email" type="email" required placeholder="name@workshop.local" className="ui-input" />
            </FormField>
            <FormField label={t("set.userPhone")}>
              <input name="phone" placeholder="+992 …" className="ui-input" />
            </FormField>
            <FormField label={t("set.userRole")}>
              <select name="roleId" className="ui-input">
                {roles.map((role) => (
                  <option key={role.id} value={role.id}>
                    {n("role", role.code, role.name)}
                  </option>
                ))}
              </select>
            </FormField>
            <FormField label={t("set.userPassword")} className="sm:col-span-2 lg:col-span-1">
              <input name="password" type="password" required minLength={8} className="ui-input" />
            </FormField>
            <button type="submit" className="ui-btn-primary min-h-[44px] sm:col-span-2 lg:col-span-3">
              {t("set.createUser")}
            </button>
          </form>
        </DashPanel>
      ) : null}

      <div className="space-y-3">
        {users.map((user) => (
          <DashPanel key={user.id} title={user.name}>
            <form action={updateUser} className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              <input type="hidden" name="id" value={user.id} />
              <FormField label={t("set.userName")}>
                <input name="name" defaultValue={user.name} disabled={!canEdit} className="ui-input" />
              </FormField>
              <FormField label={t("set.userEmail")}>
                <input value={user.email} disabled title={user.email} className="ui-input min-w-0" />
              </FormField>
              <FormField label={t("set.userPhone")}>
                <input
                  name="phone"
                  defaultValue={user.phone ?? ""}
                  disabled={!canEdit}
                  className="ui-input"
                />
              </FormField>
              <FormField label={t("set.userRole")}>
                <select name="roleId" defaultValue={user.roleId} disabled={!canEdit} className="ui-input">
                  {roles.map((role) => (
                    <option key={role.id} value={role.id}>
                      {n("role", role.code, role.name)}
                    </option>
                  ))}
                </select>
              </FormField>
              <label className="flex items-end gap-2 pb-2 text-sm">
                <input type="checkbox" name="isActive" defaultChecked={user.isActive} disabled={!canEdit} />
                {t("set.active")}
              </label>
              {canEdit ? (
                <FormField label={t("set.newPassword")} hint={t("set.newPasswordHint")}>
                  <input name="password" type="password" className="ui-input" />
                </FormField>
              ) : null}
              <div className="sm:col-span-2 lg:col-span-3 flex flex-wrap gap-3">
                {canEdit ? (
                  <button type="submit" className="ui-btn-primary min-h-[44px]">
                    {t("common.save")}
                  </button>
                ) : null}
                {canArchive && user.id !== session.user.id ? (
                  <button formAction={archiveUser} type="submit" className="ui-btn-danger min-h-[44px]">
                    {t("common.archive")}
                  </button>
                ) : null}
              </div>
            </form>
          </DashPanel>
        ))}
      </div>
    </div>
  );
}
