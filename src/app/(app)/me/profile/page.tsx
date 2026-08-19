import { requireSession } from "@core/auth/authz";
import { getTranslator } from "@core/shared/i18n/locale";
import { LogoutButton } from "@/components/logout-button";
import { LanguageSwitcher } from "@/components/language-switcher";
import Link from "next/link";
import styles from "@/styles/premium.module.css";

export default async function ProfilePage() {
  const session = await requireSession();
  const { t, locale, n } = await getTranslator();

  return (
    <div className={styles.page}>
      <header className={styles.header}><div className={styles.headerText}><h1 className={styles.title}>{t("nav.profile")}</h1></div></header>
      <section className={styles.section}>
        <div className={styles.sectionBody}>
          <p style={{ fontSize: 16, fontWeight: 600, color: "var(--ink)" }}>{session.user.name}</p>
          <p style={{ fontSize: 13, color: "var(--ink-2)", marginTop: 4 }}>{n("role", session.user.roleCode, session.user.roleName)}</p>
          <p style={{ fontSize: 13, color: "var(--ink-2)", marginTop: 2 }}>{session.user.email?.includes("@staff.internal") ? t("login.modeEmployee") : session.user.email}</p>
          <div style={{ marginTop: 14 }}>
            <p style={{ fontSize: 12, fontWeight: 600, color: "var(--ink-3)", marginBottom: 4 }}>{t("lang.switch")}</p>
            <LanguageSwitcher locale={locale} />
          </div>
          <div style={{ marginTop: 14, display: "flex", flexDirection: "column", gap: 8 }}>
            <Link href="/notifications" className={styles.ghostLink}>{t("nav.notifications")}</Link>
            <Link href="/help" className={styles.ghostLink}>{t("nav.help")}</Link>
          </div>
          <div style={{ marginTop: 14 }}><LogoutButton label={t("nav.logout")} className="min-h-[44px]" /></div>
        </div>
      </section>
    </div>
  );
}
