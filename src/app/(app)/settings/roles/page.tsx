import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/authz";
import { updateRolePermissions } from "@/app/actions/roles";

export default async function RolesPage() {
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
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Роли и права</h1>
        <p className="mt-1 text-sm text-slate-600">
          Owner, Director, Sales Manager, Production Manager, Worker, Warehouse Manager, Accountant.
        </p>
        <Link className="mt-3 inline-block text-sm text-teal-800" href="/settings">
          ← Настройки
        </Link>
      </div>

      {roles.map((role) => {
        const selected = new Set(role.permissions.map((p) => p.permissionId));
        return (
          <form
            key={role.id}
            action={updateRolePermissions}
            className="rounded-2xl border border-[var(--line)] bg-white p-5"
          >
            <input type="hidden" name="roleId" value={role.id} />
            <div className="mb-4 flex items-baseline justify-between">
              <div>
                <h2 className="font-semibold">{role.name}</h2>
                <p className="text-sm text-slate-500">{role.description}</p>
              </div>
              {role.code === "owner" ? (
                <span className="text-xs text-slate-400">полный доступ</span>
              ) : canManage ? (
                <button className="rounded-lg bg-teal-800 px-3 py-1.5 text-sm text-white">Сохранить права</button>
              ) : null}
            </div>
            {modules.map((moduleName) => (
              <div key={moduleName} className="mb-3">
                <p className="mb-1 text-xs font-medium uppercase tracking-wide text-slate-400">{moduleName}</p>
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
                          <span className="font-mono text-xs text-slate-500">{permission.code}</span>
                          <span className="ml-2">{permission.name}</span>
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
