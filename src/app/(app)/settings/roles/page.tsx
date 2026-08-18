import { getTranslator } from "@core/shared/i18n/locale";
import Link from "next/link";
import { prisma } from "@core/infrastructure/prisma";
import { requirePermission } from "@core/auth/authz";
import { updateRolePermissions } from "@/app/actions/roles";
import { PageHeader } from "@/components/page-header";

export default async function RolesPage() {
  const { t, n } = await getTranslator();
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
      <div>
        <PageHeader title={t("set.rolesTitle")} />
        <Link className="mt-3 inline-block text-sm text-[var(--titan-dark)]" href="/settings">
          {t("common.settingsBack")}
        </Link>
      </div>

      {roles.map((role) => {
        const selected = new Set(role.permissions.map((p) => p.permissionId));
        return (
          <form
            key={role.id}
            action={updateRolePermissions}
            className="ui-card"
          >
            <input type="hidden" name="roleId" value={role.id} />
            <div className="mb-4 flex items-baseline justify-between">
              <div>
                <h2 className="font-semibold">{n("role", role.code, role.name)}</h2>
                <p className="text-sm text-[var(--muted)]">{role.description}</p>
              </div>
              {role.code === "owner" ? (
                <span className="text-xs text-[var(--muted)]">{t("common.fullAccess")}</span>
              ) : canManage ? (
                <button className="ui-btn-primary">{t("set.savePerms")}</button>
              ) : null}
            </div>
            {modules.map((moduleName) => (
              <div key={moduleName} className="mb-3">
                <p className="mb-1 text-xs font-medium uppercase tracking-wide text-[var(--muted)]">{t(`mod.${moduleName}`)}</p>
                <div className="grid gap-1 sm:grid-cols-2">
                  {permissions
                    .filter((p) => p.module === moduleName)
                    .map((permission) => (
                      <label key={permission.id} className="flex items-center gap-2 text-sm">
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
        );
      })}
    </div>
  );
}
