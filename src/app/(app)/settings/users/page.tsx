import { getTranslator } from "@/lib/locale";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/authz";
import { archiveUser, createUser, updateUser } from "@/app/actions/users";
import Link from "next/link";
import { PageHeader } from "@/components/page-header";
import { FormField } from "@/components/form-field";

export default async function UsersPage() {
  const { t, n } = await getTranslator();
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
      <div>
        <PageHeader title={t("set.users")} description={t("set.usersHint")} />
        <Link className="mt-3 inline-block text-sm text-[var(--titan-dark)]" href="/settings">
          {t("common.settingsBack")}
        </Link>
      </div>

      {canCreate ? (
        <form action={createUser} className="grid gap-3 ui-card p-4 sm:grid-cols-2 lg:grid-cols-3">
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
          <button className="sm:col-span-2 lg:col-span-3 ui-btn-primary">
            {t("set.createUser")}
          </button>
        </form>
      ) : null}

      <div className="space-y-3">
        {users.map((user) => (
          <form
            key={user.id}
            action={updateUser}
            className="grid gap-3 ui-card p-4 sm:grid-cols-2 lg:grid-cols-3"
          >
            <input type="hidden" name="id" value={user.id} />
            <FormField label={t("set.userName")}>
              <input
                name="name"
                defaultValue={user.name}
                disabled={!canEdit}
                className="ui-input"
              />
            </FormField>
            <FormField label={t("set.userEmail")}>
              <input
                value={user.email}
                disabled
                title={user.email}
                className="ui-input min-w-0"
              />
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
              <select
                name="roleId"
                defaultValue={user.roleId}
                disabled={!canEdit}
                className="ui-input"
              >
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
                <button className="ui-btn-primary">{t("common.save")}</button>
              ) : null}
              {canArchive && user.id !== session.user.id ? (
                <button formAction={archiveUser} className="ui-btn-danger">
                  {t("common.archive")}
                </button>
              ) : null}
            </div>
          </form>
        ))}
      </div>
    </div>
  );
}
