import { getTranslator, intlLocale } from "@core/shared/i18n/locale";
import Link from "next/link";
import { prisma } from "@core/infrastructure/prisma";
import { requirePermission } from "@core/auth/authz";
import { PageHeader } from "@/components/page-header";

export default async function AuditPage() {
  const { t, locale } = await getTranslator();
  await requirePermission("audit.view");
  const logs = await prisma.auditLog.findMany({
    take: 100,
    orderBy: { createdAt: "desc" },
    include: { user: { select: { name: true, email: true } } },
  });

  return (
    <div className="page-stack">
      <div>
        <PageHeader title={t("set.auditTitle")} />
        <p className="mt-1 text-sm text-[var(--text-muted)]">
          {t("set.auditHint")}
        </p>
        <Link className="mt-3 inline-block text-sm text-[var(--titan-dark)]" href="/settings">
          {t("common.settingsBack")}
        </Link>
      </div>

      <div className="space-y-3">
        {logs.map((log) => (
          <article key={log.id} className="ui-card text-sm">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="font-semibold">{log.action}</p>
                <p className="text-[var(--muted)]">
                  {log.user?.name ?? t("set.system")}
                  {log.user?.email ? ` · ${log.user.email}` : ""} · {log.entityType}
                  {log.entityId ? ` · ${log.entityId}` : ""}
                </p>
              </div>
              <time className="text-xs text-[var(--muted)]">{log.createdAt.toLocaleString(intlLocale(locale))}</time>
            </div>
            <p className="mt-2 text-xs text-[var(--muted)]">
              IP: {log.ip ?? "—"} · {log.userAgent ?? t("set.noDevice")}
            </p>
            <div className="mt-3 grid gap-3 md:grid-cols-2">
              <pre className="overflow-x-auto rounded-lg bg-[var(--surface-muted)] p-3 text-xs">
                {JSON.stringify(log.oldValue ?? null, null, 2)}
              </pre>
              <pre className="overflow-x-auto rounded-lg bg-[var(--bg-secondary)] p-3 text-xs">
                {JSON.stringify(log.newValue ?? null, null, 2)}
              </pre>
            </div>
          </article>
        ))}
      </div>
    </div>
  );
}
