import { getTranslator } from "@core/shared/i18n/locale";
import { prisma } from "@core/infrastructure/prisma";
import { requirePermission, hasPermission } from "@core/auth/authz";
import { archiveUser, createUser, updateUser } from "@/app/actions/users";
import { updateRolePermissions } from "@/app/actions/roles";
import { FormField } from "@/components/form-field";
import { AppSelect } from "@/components/app-select";
import { SettingsNav } from "@/components/settings-nav";
import styles from "@/styles/premium.module.css";

export default async function UsersPage() {
  const { t, n, locale } = await getTranslator();
  const session = await requirePermission("users.view");
  const canCreate = session.user.roleCode === "owner" || session.user.permissions.includes("users.create");
  const canEdit = session.user.roleCode === "owner" || session.user.permissions.includes("users.edit");
  const canArchive = session.user.roleCode === "owner" || session.user.permissions.includes("users.archive");
  const canSeeRoles = hasPermission(session.user.permissions, session.user.roleCode, "roles.view");
  const canManageRoles = session.user.roleCode === "owner" || session.user.permissions.includes("roles.manage");

  const [users, roles, permissions] = await Promise.all([
    prisma.user.findMany({ where: { archivedAt: null }, include: { role: true }, orderBy: { createdAt: "asc" } }),
    prisma.role.findMany({
      where: { archivedAt: null },
      include: { permissions: true },
      orderBy: { name: "asc" },
    }),
    canSeeRoles ? prisma.permission.findMany({ orderBy: [{ module: "asc" }, { code: "asc" }] }) : Promise.resolve([]),
  ]);
  const modules = [...new Set(permissions.map((p) => p.module))];

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <div className={styles.headerText}>
          <h1 className={styles.title}>{t("set.access")}</h1>
          <p className={styles.subtitle}>{t("set.usersHint")}</p>
        </div>
      </header>
      <SettingsNav current="access" locale={locale} />

      {canCreate ? (
        <section className={styles.section}>
          <div className={styles.sectionHead}>
            <h2 className={styles.sectionTitle}>{t("set.createUser")}</h2>
          </div>
          <div className={styles.sectionBody}>
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
                <AppSelect
                  name="roleId"
                  defaultValue={roles[0]?.id ?? ""}
                  options={roles.map((role) => ({ value: role.id, label: n("role", role.code, role.name) }))}
                />
              </FormField>
              <FormField label={t("set.userPassword")} className="sm:col-span-2 lg:col-span-1">
                <input name="password" type="password" required minLength={8} className="ui-input" />
              </FormField>
              <button type="submit" className="ui-btn-primary min-h-[44px] sm:col-span-2 lg:col-span-3">
                {t("set.createUser")}
              </button>
            </form>
          </div>
        </section>
      ) : null}

      <section className={styles.section}>
        <div className={styles.sectionHead}>
          <h2 className={styles.sectionTitle}>{t("set.users")}</h2>
        </div>
      </section>

      {users.map((user) => (
        <section key={user.id} className={styles.section}>
          <div className={styles.sectionHead}>
            <h2 className={styles.sectionTitle}>{user.name}</h2>
          </div>
          <div className={styles.sectionBody}>
            <form action={updateUser} className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              <input type="hidden" name="id" value={user.id} />
              <FormField label={t("set.userName")}>
                <input name="name" defaultValue={user.name} disabled={!canEdit} className="ui-input" />
              </FormField>
              <FormField label={t("set.userEmail")}>
                <input value={user.email} disabled title={user.email} className="ui-input min-w-0" />
              </FormField>
              <FormField label={t("set.userPhone")}>
                <input name="phone" defaultValue={user.phone ?? ""} disabled={!canEdit} className="ui-input" />
              </FormField>
              <FormField label={t("set.userRole")}>
                <AppSelect
                  name="roleId"
                  defaultValue={user.roleId}
                  disabled={!canEdit}
                  options={roles.map((role) => ({ value: role.id, label: n("role", role.code, role.name) }))}
                />
              </FormField>
              <FormField label={t("set.active")} className="pb-2">
                <input type="checkbox" name="isActive" defaultChecked={user.isActive} disabled={!canEdit} />
              </FormField>
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
          </div>
        </section>
      ))}

      {canSeeRoles ? (
        <>
          <section className={styles.section} id="roles">
            <div className={styles.sectionHead}>
              <h2 className={styles.sectionTitle}>{t("set.rolesTitle")}</h2>
            </div>
          </section>
          {roles.map((role) => {
            const selected = new Set(role.permissions.map((p) => p.permissionId));
            return (
              <section key={role.id} className={styles.section}>
                <div className={styles.sectionHead}>
                  <h2 className={styles.sectionTitle}>{n("role", role.code, role.name)}</h2>
                  {role.code === "owner" ? (
                    <span style={{ fontSize: 12, color: "var(--ink-3)" }}>{t("common.fullAccess")}</span>
                  ) : canManageRoles ? (
                    <button form={`role-${role.id}`} type="submit" className="ui-btn-primary min-h-[44px] px-3 text-xs">
                      {t("set.savePerms")}
                    </button>
                  ) : null}
                </div>
                <div className={styles.sectionBody}>
                  {role.description ? (
                    <p style={{ marginBottom: 14, fontSize: 13, color: "var(--ink-2)" }}>{role.description}</p>
                  ) : null}
                  <form id={`role-${role.id}`} action={updateRolePermissions}>
                    <input type="hidden" name="roleId" value={role.id} />
                    {modules.map((moduleName) => (
                      <div key={moduleName} style={{ marginBottom: 12 }}>
                        <p
                          style={{
                            marginBottom: 4,
                            fontSize: 12,
                            fontWeight: 600,
                            textTransform: "uppercase",
                            letterSpacing: "0.04em",
                            color: "var(--ink-3)",
                          }}
                        >
                          {t(`mod.${moduleName}`)}
                        </p>
                        <div className="grid gap-1 sm:grid-cols-2">
                          {permissions
                            .filter((p) => p.module === moduleName)
                            .map((permission) => (
                              <label key={permission.id} className="flex min-h-[44px] items-center gap-2 text-sm">
                                <input
                                  type="checkbox"
                                  name="permissionId"
                                  value={permission.id}
                                  defaultChecked={role.code === "owner" || selected.has(permission.id)}
                                  disabled={!canManageRoles || role.code === "owner"}
                                />
                                <span>{t(`perm.${permission.code}`)}</span>
                              </label>
                            ))}
                        </div>
                      </div>
                    ))}
                  </form>
                </div>
              </section>
            );
          })}
        </>
      ) : null}
    </div>
  );
}
