import { getTranslator } from "@core/shared/i18n/locale";
import { prisma } from "@core/infrastructure/prisma";
import { requirePermission, hasPermission } from "@core/auth/authz";
import { updateRolePermissions } from "@/app/actions/roles";
import { AccessUsersPanel } from "@/components/access-users-panel";
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
    prisma.user.findMany({
      where: { archivedAt: null, role: { code: { not: "owner" } } },
      include: { role: true },
      orderBy: { createdAt: "asc" },
    }),
    prisma.role.findMany({
      where: { archivedAt: null },
      include: { permissions: true },
      orderBy: { name: "asc" },
    }),
    canSeeRoles ? prisma.permission.findMany({ orderBy: [{ module: "asc" }, { code: "asc" }] }) : Promise.resolve([]),
  ]);
  const modules = [...new Set(permissions.map((p) => p.module))];
  const assignableRoles = roles
    .filter((role) => role.code !== "owner")
    .map((role) => ({ id: role.id, label: n("role", role.code, role.name) }));
  const visibleRoles = roles.filter((role) => role.code !== "owner");

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <div className={styles.headerText}>
          <h1 className={styles.title}>{t("set.access")}</h1>
          <p className={styles.subtitle}>{t("set.usersHint")}</p>
        </div>
      </header>
      <SettingsNav current="access" locale={locale} />

      <AccessUsersPanel
        locale={locale}
        canCreate={canCreate}
        canEdit={canEdit}
        canArchive={canArchive}
        currentUserId={session.user.id}
        roles={assignableRoles}
        users={users.map((user) => ({
          id: user.id,
          name: user.name,
          phone: user.phone,
          roleId: user.roleId,
          isActive: user.isActive,
          roleLabel: n("role", user.role.code, user.role.name),
        }))}
      />

      {canSeeRoles ? (
        <>
          <section className={styles.section} id="roles">
            <div className={styles.sectionHead}>
              <h2 className={styles.sectionTitle}>{t("set.rolesTitle")}</h2>
            </div>
          </section>
          {visibleRoles.map((role) => {
            const selected = new Set(role.permissions.map((p) => p.permissionId));
            return (
              <section key={role.id} className={styles.section}>
                <div className={styles.sectionHead}>
                  <h2 className={styles.sectionTitle}>{n("role", role.code, role.name)}</h2>
                  {canManageRoles ? (
                    <button form={`role-${role.id}`} type="submit" className="ui-btn-soft min-h-[44px] px-3 text-xs">
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
                                  defaultChecked={selected.has(permission.id)}
                                  disabled={!canManageRoles}
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
