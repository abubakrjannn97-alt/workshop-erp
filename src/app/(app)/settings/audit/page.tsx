import { getTranslator, intlLocale } from "@core/shared/i18n/locale";
import { prisma } from "@core/infrastructure/prisma";
import { requirePermission } from "@core/auth/authz";
import styles from "@/styles/premium.module.css";

export default async function AuditPage() {
  const { t, locale } = await getTranslator();
  await requirePermission("audit.view");
  const logs = await prisma.auditLog.findMany({ take: 100, orderBy: { createdAt: "desc" }, include: { user: { select: { name: true, email: true } } } });

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <div className={styles.headerText}>
          <h1 className={styles.title}>{t("set.auditTitle")}</h1>
          <p className={styles.subtitle}>{t("set.auditHint")}</p>
        </div>
      </header>

      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {logs.map((log) => (
          <div key={log.id} className={styles.logCard}>
            <p className={styles.logAction}>{log.action}</p>
            <p className={styles.logMeta}>
              {log.user?.name ?? t("set.system")}{log.user?.email ? ` · ${log.user.email}` : ""} · {log.entityType}{log.entityId ? ` · ${log.entityId}` : ""}
              {" · "}<time>{log.createdAt.toLocaleString(intlLocale(locale))}</time>
            </p>
            <p className={styles.logMeta}>IP: {log.ip ?? "—"} · {log.userAgent ?? t("set.noDevice")}</p>
            <div className="grid gap-3 md:grid-cols-2" style={{ marginTop: 10 }}>
              <pre className={styles.logPre}>{JSON.stringify(log.oldValue ?? null, null, 2)}</pre>
              <pre className={styles.logPre}>{JSON.stringify(log.newValue ?? null, null, 2)}</pre>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
