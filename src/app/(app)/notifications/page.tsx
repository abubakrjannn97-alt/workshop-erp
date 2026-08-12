import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { requireSession } from "@/lib/authz";
import { markNotificationsRead } from "@/app/actions/control";

export default async function NotificationsPage() {
  const session = await requireSession();
  const items = await prisma.notification.findMany({
    where: { userId: session.user.id },
    orderBy: { createdAt: "desc" },
    take: 50,
  });

  async function readAll() {
    "use server";
    await markNotificationsRead();
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs font-medium uppercase tracking-[0.16em] text-teal-800">PHASE 8</p>
          <h1 className="mt-1 text-2xl font-semibold">Уведомления</h1>
        </div>
        <form action={readAll}>
          <button className="text-sm text-teal-800 hover:underline">Отметить прочитанными</button>
        </form>
      </div>
      <ul className="divide-y divide-slate-100 rounded-2xl border border-[var(--line)] bg-white">
        {items.length === 0 ? (
          <li className="px-5 py-8 text-sm text-slate-500">Нет уведомлений.</li>
        ) : (
          items.map((n) => (
            <li key={n.id} className={`px-5 py-3 text-sm ${n.readAt ? "text-slate-500" : ""}`}>
              <p className="font-medium">{n.title}</p>
              <p className="text-xs">{n.body}</p>
              <p className="mt-1 text-[11px] text-slate-400">{n.createdAt.toLocaleString("ru-RU")}</p>
              {n.entityType === "approval" && n.entityId ? (
                <Link href="/settings/approvals" className="text-xs text-teal-800 hover:underline">
                  Открыть согласования
                </Link>
              ) : null}
            </li>
          ))
        )}
      </ul>
    </div>
  );
}
