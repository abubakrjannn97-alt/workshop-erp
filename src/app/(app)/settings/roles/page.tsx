import { getTranslator } from "@core/shared/i18n/locale";
import { prisma } from "@core/infrastructure/prisma";
import { requirePermission } from "@core/auth/authz";
import { updateRolePermissions } from "@/app/actions/roles";
import { SettingsNav } from "@/components/settings-nav";
import styles from "@/styles/premium.module.css";

export default async function RolesPage() {
  const { t, n, locale } = await getTranslator();
  const session = await requirePermission("roles.view");
  const canManage = session.user.roleCode === "owner" || session.user.permissions.includes("roles.manage");

  const [roles, permissions] = await Promise.all([
    prisma.role.findMany({ where: { archivedAt: null }, include: { permissions: true }, orderBy: { name: "asc" } }),
    prisma.permission.findMany({ orderBy: [{ module: "asc" }, { code: "asc" }] }),
  ]);
  const modules = [...new Set(permissions.map((p) => p.module))];

  return (
    <div className={styles.page}>
      <header className={styles.header}><div className={styles.headerText}><h1 className={styles.title}>{t("set.rolesTitle")}</h1></div></header>
      <SettingsNav current="roles" locale={locale} />

      {roles.map((role) => {
        const selected = new Set(role.permissions.map((p) => p.permissionId));
        return (
          <section key={role.id} className={styles.section}>
            <div className={styles.sectionHead}>
              <h2 className={styles.sectionTitle}>{n("role", role.code, role.name)}</h2>
              {role.code === "owner" ? <span style={{ fontSize: 12, color: "var(--ink-3)" }}>{t("common.fullAccess")}</span> : canManage ? <button form={`role-${role.id}`} type="submit" className="ui-btn-primary min-h-[44px] px-3 text-xs">{t("set.savePerms")}</button> : null}
            </div>
            <div className={styles.sectionBody}>
              {role.description ? <p style={{ marginBottom: 14, fontSize: 13, color: "var(--ink-2)" }}>{role.description}</p> : null}
              <form id={`role-${role.id}`} action={updateRolePermissions}>
                <input type="hidden" name="roleId" value={role.id} />
                {modules.map((moduleName) => (
                  <div key={moduleName} style={{ marginBottom: 12 }}>
                    <p style={{ marginBottom: 4, fontSize: 12, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.04em", color: "var(--ink-3)" }}>{t(`mod.${moduleName}`)}</p>
                    <div className="grid gap-1 sm:grid-cols-2">
                      {permissions.filter((p) => p.module === moduleName).map((permission) => (
                        <label key={permission.id} className="flex min-h-[44px] items-center gap-2 text-sm">
                          <input type="checkbox" name="permissionId" value={permission.id} defaultChecked={role.code === "owner" || selected.has(permission.id)} disabled={!canManage || role.code === "owner"} />
                          <span><span style={{ fontFamily: "var(--font-mono)", fontSize: 11, color: "var(--ink-3)" }}>{permission.code}</span><span style={{ marginLeft: 8 }}>{t(`perm.${permission.code}`)}</span></span>
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
    </div>
  );
}
