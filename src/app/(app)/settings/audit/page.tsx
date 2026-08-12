import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/authz";

export default async function AuditPage() {
  await requirePermission("audit.view");
  const logs = await prisma.auditLog.findMany({
    take: 100,
    orderBy: { createdAt: "desc" },
    include: { user: { select: { name: true, email: true } } },
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Журнал действий</h1>
        <p className="mt-1 text-sm text-slate-600">
          Пользователь, действие, дата, время, IP, устройство, старое и новое значение.
        </p>
        <Link className="mt-3 inline-block text-sm text-teal-800" href="/settings">
          ← Настройки
        </Link>
      </div>

      <div className="space-y-3">
        {logs.map((log) => (
          <article key={log.id} className="rounded-2xl border border-[var(--line)] bg-white p-5 text-sm">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="font-semibold">{log.action}</p>
                <p className="text-slate-500">
                  {log.user?.name ?? "система"}
                  {log.user?.email ? ` · ${log.user.email}` : ""} · {log.entityType}
                  {log.entityId ? ` · ${log.entityId}` : ""}
                </p>
              </div>
              <time className="text-xs text-slate-400">{log.createdAt.toLocaleString("ru-RU")}</time>
            </div>
            <p className="mt-2 text-xs text-slate-500">
              IP: {log.ip ?? "—"} · {log.userAgent ?? "устройство не передано"}
            </p>
            <div className="mt-3 grid gap-3 md:grid-cols-2">
              <pre className="overflow-x-auto rounded-lg bg-slate-50 p-3 text-xs">
                {JSON.stringify(log.oldValue ?? null, null, 2)}
              </pre>
              <pre className="overflow-x-auto rounded-lg bg-teal-50 p-3 text-xs">
                {JSON.stringify(log.newValue ?? null, null, 2)}
              </pre>
            </div>
          </article>
        ))}
      </div>
    </div>
  );
}
