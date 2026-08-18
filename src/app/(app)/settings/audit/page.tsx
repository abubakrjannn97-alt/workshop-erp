import { getTranslator, intlLocale } from "@core/shared/i18n/locale";
import { prisma } from "@core/infrastructure/prisma";
import { requirePermission } from "@core/auth/authz";
import { PageHeader } from "@/components/page-header";
import { SettingsNav } from "@/components/settings-nav";
import { DashPanel } from "@/components/dash-panel";

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
      <PageHeader title={t("set.auditTitle")} description={t("set.auditHint")} />
      <SettingsNav current="audit" locale={locale} />

      <div className="space-y-3">
        {logs.map((log) => (
          <DashPanel key={log.id} title={log.action}>
            <div className="flex flex-wrap items-start justify-between gap-3 text-sm">
              <div>
                <p className="text-[var(--muted)]">
                  {log.user?.name ?? t("set.system")}
                  {log.user?.email ? ` · ${log.user.email}` : ""} · {log.entityType}
                  {log.entityId ? ` · ${log.entityId}` : ""}
                </p>
                <p className="mt-1 text-xs text-[var(--muted)]">
                  IP: {log.ip ?? "—"} · {log.userAgent ?? t("set.noDevice")}
                </p>
              </div>
              <time className="text-xs text-[var(--muted)]">{log.createdAt.toLocaleString(intlLocale(locale))}</time>
            </div>
            <div className="mt-3 grid gap-3 md:grid-cols-2">
              <pre className="overflow-x-auto rounded-lg bg-[var(--surface-muted)] p-3 text-xs">
                {JSON.stringify(log.oldValue ?? null, null, 2)}
              </pre>
              <pre className="overflow-x-auto rounded-lg bg-[var(--bg-secondary)] p-3 text-xs">
                {JSON.stringify(log.newValue ?? null, null, 2)}
              </pre>
            </div>
          </DashPanel>
        ))}
      </div>
    </div>
  );
}
