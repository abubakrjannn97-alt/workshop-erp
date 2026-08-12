import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/authz";
import { archiveUser, createUser, updateUser } from "@/app/actions/users";
import Link from "next/link";

export default async function UsersPage() {
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
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Пользователи</h1>
        <p className="mt-1 text-sm text-slate-600">Учётные записи не удаляются — только архив.</p>
        <Link className="mt-3 inline-block text-sm text-teal-800" href="/settings">
          ← Настройки
        </Link>
      </div>

      {canCreate ? (
        <form action={createUser} className="grid gap-3 rounded-2xl border border-[var(--line)] bg-white p-5 sm:grid-cols-5">
          <input name="name" required placeholder="Имя" className="rounded-lg border border-slate-200 px-3 py-2 text-sm" />
          <input name="email" type="email" required placeholder="Email" className="rounded-lg border border-slate-200 px-3 py-2 text-sm" />
          <input name="phone" placeholder="Телефон" className="rounded-lg border border-slate-200 px-3 py-2 text-sm" />
          <select name="roleId" className="rounded-lg border border-slate-200 px-3 py-2 text-sm">
            {roles.map((role) => (
              <option key={role.id} value={role.id}>
                {role.name}
              </option>
            ))}
          </select>
          <input name="password" type="password" required minLength={8} placeholder="Пароль" className="rounded-lg border border-slate-200 px-3 py-2 text-sm" />
          <button className="sm:col-span-5 rounded-lg bg-teal-800 px-4 py-2 text-sm font-medium text-white">
            Создать пользователя
          </button>
        </form>
      ) : null}

      <div className="space-y-3">
        {users.map((user) => (
          <form
            key={user.id}
            action={updateUser}
            className="grid gap-3 rounded-2xl border border-[var(--line)] bg-white p-5 sm:grid-cols-6"
          >
            <input type="hidden" name="id" value={user.id} />
            <input name="name" defaultValue={user.name} disabled={!canEdit} className="rounded-lg border border-slate-200 px-3 py-2 text-sm" />
            <input value={user.email} disabled className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm" />
            <input name="phone" defaultValue={user.phone ?? ""} disabled={!canEdit} className="rounded-lg border border-slate-200 px-3 py-2 text-sm" />
            <select name="roleId" defaultValue={user.roleId} disabled={!canEdit} className="rounded-lg border border-slate-200 px-3 py-2 text-sm">
              {roles.map((role) => (
                <option key={role.id} value={role.id}>
                  {role.name}
                </option>
              ))}
            </select>
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" name="isActive" defaultChecked={user.isActive} disabled={!canEdit} />
              Активен
            </label>
            <input name="password" type="password" placeholder="Новый пароль" disabled={!canEdit} className="rounded-lg border border-slate-200 px-3 py-2 text-sm" />
            <div className="sm:col-span-6 flex gap-3">
              {canEdit ? (
                <button className="rounded-lg bg-teal-800 px-3 py-1.5 text-sm text-white">Сохранить</button>
              ) : null}
              {canArchive && user.id !== session.user.id ? (
                <button formAction={archiveUser} className="text-sm text-red-700">
                  В архив
                </button>
              ) : null}
            </div>
          </form>
        ))}
      </div>
    </div>
  );
}
