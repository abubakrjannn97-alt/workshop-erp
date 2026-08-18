import { getTranslator } from "@core/shared/i18n/locale";
import { prisma } from "@core/infrastructure/prisma";
import { requirePermission } from "@core/auth/authz";
import { updateRolePermissions } from "@/app/actions/roles";
import { PageHeader } from "@/components/page-header";
import { SettingsNav } from "@/components/settings-nav";
import { DashPanel } from "@/components/dash-panel";

export default async function RolesPage() {
  const { t, n, locale } = await getTranslator();
  const session = await requirePermission("roles.view");
  const canManage =
    session.user.roleCode === "owner" || session.user.permissions.includes("roles.manage");

  const [roles, permissions] = await Promise.all([
    prisma.role.findMany({
      where: { archivedAt: null },
      include: { permissions: true },
      orderBy: { name: "asc" },
    }),
    prisma.permission.findMany({ orderBy: [{ module: "asc" }, { code: "asc" }] }),
  ]);

  const modules = [...new Set(permissions.map((p) => p.module))];

  return (
    <div className="page-stack">
      <PageHeader title={t("set.rolesTitle")} />
      <SettingsNav current="roles" locale={locale} />

      {roles.map((role) => {
        const selected = new Set(role.permissions.map((p) => p.permissionId));
        return (
          <DashPanel
            key={role.id}
            title={n("role", role.code, role.name)}
            action={
              role.code === "owner" ? (
                <span className="text-xs text-[var(--muted)]">{t("common.fullAccess")}</span>
              ) : canManage ? (
                <button form={`role-${role.id}`} type="submit" className="ui-btn-primary min-h-[44px] px-3 text-xs">
                  {t("set.savePerms")}
                </button>
              ) : null
            }
          >
            {role.description ? <p className="mb-4 text-sm text-[var(--muted)]">{role.description}</p> : null}
            <form id={`role-${role.id}`} action={updateRolePermissions}>
              <input type="hidden" name="roleId" value={role.id} />
              {modules.map((moduleName) => (
                <div key={moduleName} className="mb-3">
                  <p className="mb-1 text-xs font-medium uppercase tracking-wide text-[var(--muted)]">
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
                            disabled={!canManage || role.code === "owner"}
                          />
                          <span>
                            <span className="font-mono text-xs text-[var(--muted)]">{permission.code}</span>
                            <span className="ml-2">{t(`perm.${permission.code}`)}</span>
                          </span>
                        </label>
                      ))}
                  </div>
                </div>
              ))}
            </form>
          </DashPanel>
        );
      })}
    </div>
  );
}
