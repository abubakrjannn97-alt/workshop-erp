import { requireSession } from "@core/auth/authz";
import { getTranslator } from "@/lib/locale";
import { PageHeader } from "@/components/page-header";
import { LogoutButton } from "@/components/logout-button";
import { LanguageSwitcher } from "@/components/language-switcher";
import Link from "next/link";

export default async function ProfilePage() {
  const session = await requireSession();
  const { t, locale, n } = await getTranslator();

  return (
    <div className="page-stack">
      <PageHeader title={t("nav.profile")} />
      <section className="ui-card space-y-2 p-4 text-sm">
        <p className="text-[16px] font-semibold">{session.user.name}</p>
        <p className="text-[var(--text-muted)]">{n("role", session.user.roleCode, session.user.roleName)}</p>
        <p className="text-[var(--text-muted)]">
          {session.user.email?.includes("@staff.internal")
            ? t("login.modeEmployee")
            : session.user.email}
        </p>
        <div className="pt-2">
          <p className="ui-label">{t("lang.switch")}</p>
          <LanguageSwitcher locale={locale} />
        </div>
        <Link href="/notifications" className="block pt-2 text-[var(--titan-dark)]">
          {t("nav.notifications")}
        </Link>
        <Link href="/help" className="block text-[var(--titan-dark)]">
          {t("nav.help")}
        </Link>
        <LogoutButton label={t("nav.logout")} className="pt-2" />
      </section>
    </div>
  );
}
