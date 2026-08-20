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
import styles from "./notifications.module.css";

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
        </div>
        <form action={readAll}>
          <button type="submit" className={styles.markBtn}>
            {t("notif.markRead")}
          </button>
        </form>
      </header>

      <div className={styles.filterRow}>
        <span className={styles.filterLabel}>{t("notif.filter")}</span>
        <NotifCategoryFilter
          active={active}
          ariaLabel={t("notif.filter")}
          options={NOTIF_CATEGORIES.map((cat) => ({
            value: cat,
            label: catLabel(cat),
          }))}
        />
      </div>

      <section className={styles.listCard} data-tour="notif-list">
        {filtered.length === 0 ? (
          <div className={styles.empty}>{t("notif.emptyCat")}</div>
        ) : (
          <RevealList moreLabel={t("home.seeAll")} lessLabel={t("home.hide")} limit={12}>
            {filtered.map((n) => {
              const href = notificationHref(n.entityType, n.entityId);
              const cat = notificationCategory(n.type);
              return (
                <li key={n.id} className={`${styles.item} ${n.readAt ? styles.itemRead : ""}`}>
                  <div className={styles.itemTop}>
                    <p className={styles.itemTitle}>{n.title}</p>
                    <span className={styles.itemCat}>{t(`notif.cat.${cat}`)}</span>
                  </div>
                  <p className={styles.itemBody}>{n.body}</p>
                  <p className={styles.itemTime}>
                    {n.createdAt.toLocaleString(intlLocale(locale), {
                      day: "2-digit",
                      month: "2-digit",
                      year: "numeric",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </p>
                  {href ? (
                    <Link href={href} className={styles.itemOpen}>
                      {t("notif.open")}
                    </Link>
                  ) : null}
                </li>
              );
            })}
          </RevealList>
        )}
      </section>
    </div>
  );
}
