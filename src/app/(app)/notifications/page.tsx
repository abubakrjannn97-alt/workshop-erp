import { getTranslator } from "@core/shared/i18n/locale";
import { intlLocale } from "@core/shared/i18n/i18n";
import Link from "next/link";
import { prisma } from "@core/infrastructure/prisma";
import { requireSession } from "@core/auth/authz";
import { markNotificationsRead } from "@/app/actions/control";
import { PageHeader } from "@/components/page-header";
import { RevealList } from "@/components/reveal-list";

export default async function NotificationsPage() {
  const { t, locale } = await getTranslator();
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
    <div className="page-stack">
      <div data-tour="page-notifications">
        <PageHeader
          title={t("page.notifications")}
          actions={
            <form action={readAll}>
              <button type="submit" className="ui-btn-primary">
                {t("notif.markRead")}
              </button>
            </form>
          }
        />
      </div>
      {items.length === 0 ? (
        <ul className="divide-y divide-[var(--border)] ui-card" data-tour="notif-list">
          <li className="px-4 py-6 text-sm text-[var(--muted)]">{t("notif.empty")}</li>
        </ul>
      ) : (
        <div className="ui-card" data-tour="notif-list">
          <RevealList moreLabel={t("home.seeAll")} lessLabel={t("home.hide")} limit={5} className="divide-y divide-[var(--border)]">
            {items.map((n) => (
              <li key={n.id} className={`px-3 py-2 text-sm ${n.readAt ? "text-[var(--muted)]" : ""}`}>
                <p className="font-medium">{n.title}</p>
                <p className="text-xs">{n.body}</p>
                <p className="mt-1 text-[11px] text-[var(--muted)]">{n.createdAt.toLocaleString(intlLocale(locale))}</p>
                {n.entityType === "approval" && n.entityId ? (
                  <Link href="/settings/approvals" className="text-xs text-[var(--titan-dark)] hover:underline">
                    {t("notif.openApprovals")}
                  </Link>
                ) : null}
              </li>
            ))}
          </RevealList>
        </div>
      )}
    </div>
  );
}
