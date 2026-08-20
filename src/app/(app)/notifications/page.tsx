import { getTranslator } from "@core/shared/i18n/locale";
import { intlLocale } from "@core/shared/i18n/i18n";
import Link from "next/link";
import { prisma } from "@core/infrastructure/prisma";
import { requireSession } from "@core/auth/authz";
import { markNotificationsRead } from "@/app/actions/control";
import { RevealList } from "@/components/reveal-list";
import { NotifCategoryFilter } from "@/components/notif-category-filter";
import {
  NOTIF_CATEGORIES,
  notificationCategory,
  notificationHref,
  resolveNotifCategory,
  type NotifCategory,
} from "@core/control/notification-categories";
import styles from "@/styles/premium.module.css";

export default async function NotificationsPage({
  searchParams,
}: {
  searchParams: Promise<{ cat?: string }>;
}) {
  const { t, locale } = await getTranslator();
  const session = await requireSession();
  const params = await searchParams;
  const active = resolveNotifCategory(params.cat);

  const items = await prisma.notification.findMany({
    where: { userId: session.user.id },
    orderBy: { createdAt: "desc" },
    take: 100,
  });

  const unread = Object.fromEntries(NOTIF_CATEGORIES.map((c) => [c, 0])) as Record<NotifCategory, number>;
  for (const n of items) {
    const cat = notificationCategory(n.type);
    if (!n.readAt) {
      unread.all += 1;
      unread[cat] += 1;
    }
  }

  const filtered =
    active === "all" ? items : items.filter((n) => notificationCategory(n.type) === active);

  async function readAll() {
    "use server";
    await markNotificationsRead();
  }

  function catLabel(cat: NotifCategory) {
    const base = t(`notif.cat.${cat}`);
    const n = unread[cat];
    return n > 0 ? `${base} (${n})` : base;
  }

  return (
    <div className={styles.page}>
      <header className={styles.header} data-tour="page-notifications">
        <div className={styles.headerText}>
          <h1 className={styles.title}>{t("page.notifications")}</h1>
          <p className={styles.subtitle}>{t("notif.hint")}</p>
        </div>
        <div className={styles.headerActions}>
          <form action={readAll}>
            <button type="submit" className="ui-btn-primary min-h-[44px]">
              {t("notif.markRead")}
            </button>
          </form>
        </div>
      </header>

      <div className="flex flex-wrap items-center gap-3">
        <span className="text-sm font-medium text-[var(--ink-2)]">{t("notif.filter")}</span>
        <NotifCategoryFilter
          active={active}
          ariaLabel={t("notif.filter")}
          options={NOTIF_CATEGORIES.map((cat) => ({
            value: cat,
            label: catLabel(cat),
          }))}
        />
      </div>

      <section className={styles.section} data-tour="notif-list">
        {filtered.length === 0 ? (
          <div className={styles.empty}>{t("notif.emptyCat")}</div>
        ) : (
          <div className={styles.sectionBody} style={{ padding: 0 }}>
            <RevealList moreLabel={t("home.seeAll")} lessLabel={t("home.hide")} limit={12}>
              {filtered.map((n) => {
                const href = notificationHref(n.entityType, n.entityId);
                const cat = notificationCategory(n.type);
                return (
                  <li
                    key={n.id}
                    style={{
                      padding: "12px 18px",
                      borderBottom: "1px solid var(--line)",
                      opacity: n.readAt ? 0.62 : 1,
                    }}
                  >
                    <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: 8 }}>
                      <p style={{ margin: 0, fontSize: 14, fontWeight: 600, color: "var(--ink)" }}>{n.title}</p>
                      <span
                        style={{
                          flexShrink: 0,
                          fontSize: 11,
                          fontWeight: 600,
                          color: "var(--ink-3)",
                          textTransform: "uppercase",
                          letterSpacing: "0.03em",
                        }}
                      >
                        {t(`notif.cat.${cat}`)}
                      </span>
                    </div>
                    <p style={{ margin: "4px 0 0", fontSize: 13, color: "var(--ink-2)" }}>{n.body}</p>
                    <p style={{ margin: "6px 0 0", fontSize: 11, color: "var(--ink-3)" }}>
                      {n.createdAt.toLocaleString(intlLocale(locale), {
                        day: "2-digit",
                        month: "2-digit",
                        year: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </p>
                    {href ? (
                      <Link
                        href={href}
                        style={{ display: "inline-block", marginTop: 6, fontSize: 12, fontWeight: 600, color: "var(--accent)" }}
                      >
                        {t("notif.open")}
                      </Link>
                    ) : null}
                  </li>
                );
              })}
            </RevealList>
          </div>
        )}
      </section>
    </div>
  );
}
