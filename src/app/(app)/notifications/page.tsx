import { getTranslator } from "@core/shared/i18n/locale";
import { intlLocale } from "@core/shared/i18n/i18n";
import Link from "next/link";
import { prisma } from "@core/infrastructure/prisma";
import { requireSession } from "@core/auth/authz";
import { markNotificationsRead } from "@/app/actions/control";
import { RevealList } from "@/components/reveal-list";
import styles from "@/styles/premium.module.css";

export default async function NotificationsPage() {
  const { t, locale } = await getTranslator();
  const session = await requireSession();
  const items = await prisma.notification.findMany({ where: { userId: session.user.id }, orderBy: { createdAt: "desc" }, take: 50 });

  async function readAll() { "use server"; await markNotificationsRead(); }

  return (
    <div className={styles.page}>
      <header className={styles.header} data-tour="page-notifications">
        <div className={styles.headerText}><h1 className={styles.title}>{t("page.notifications")}</h1></div>
        <div className={styles.headerActions}>
          <form action={readAll}><button type="submit" className="ui-btn-primary min-h-[44px]">{t("notif.markRead")}</button></form>
        </div>
      </header>

      <section className={styles.section} data-tour="notif-list">
        {items.length === 0 ? (
          <div className={styles.empty}>{t("notif.empty")}</div>
        ) : (
          <div className={styles.sectionBody} style={{ padding: 0 }}>
            <RevealList moreLabel={t("home.seeAll")} lessLabel={t("home.hide")} limit={10}>
              {items.map((n) => (
                <li key={n.id} style={{ padding: "10px 18px", borderBottom: "1px solid var(--line)", opacity: n.readAt ? 0.6 : 1 }}>
                  <p style={{ fontSize: 14, fontWeight: 600, color: "var(--ink)" }}>{n.title}</p>
                  <p style={{ fontSize: 13, color: "var(--ink-2)", marginTop: 2 }}>{n.body}</p>
                  <p style={{ fontSize: 11, color: "var(--ink-3)", marginTop: 4 }}>{n.createdAt.toLocaleString(intlLocale(locale))}</p>
                  {n.entityType === "approval" && n.entityId ? <Link href="/settings/approvals" style={{ fontSize: 12, fontWeight: 500, color: "var(--accent)" }}>{t("notif.openApprovals")}</Link> : null}
                </li>
              ))}
            </RevealList>
          </div>
        )}
      </section>
    </div>
  );
}
