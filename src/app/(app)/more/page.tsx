import Link from "next/link";
import { redirect } from "next/navigation";
import { requireSession } from "@core/auth/authz";
import { getTranslator } from "@core/shared/i18n/locale";
import { PageHeader } from "@/components/page-header";
import { LogoutButton } from "@/components/logout-button";
import { moreGroupsForRole } from "@core/shared/nav";
import { NavIconGlyph } from "@/components/nav-icons";
import styles from "./more.module.css";

export default async function MorePage() {
  const session = await requireSession();
  const { t } = await getTranslator();
  if (session.user.roleCode === "worker") redirect("/me");

  const groups = moreGroupsForRole(session.user.roleCode, session.user.permissions);

  return (
    <div className={styles.page}>
      <PageHeader title={t("nav.more")} />

      {groups.map((g) => (
        <section key={g.id} className={styles.group}>
          <h2 className={styles.groupTitle}>{t(g.labelKey ?? "nav.more")}</h2>
          <ul className={styles.list}>
            {g.items.map((item) => (
              <li key={item.href}>
                <Link href={item.href} prefetch className={styles.row}>
                  <span className={styles.rowIcon}>
                    <NavIconGlyph icon={item.icon} size={18} />
                  </span>
                  <span className={styles.rowLabel}>{t(item.labelKey)}</span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      ))}

      <section className={styles.account}>
        <p className={styles.accountName}>{session.user.name}</p>
        <p className={styles.accountRole}>{session.user.roleName}</p>
        <Link href="/me/profile" className={styles.accountLink}>
          {t("nav.profile")}
        </Link>
        <div className={styles.accountLogout}>
          <LogoutButton label={t("nav.logout")} />
        </div>
      </section>
    </div>
  );
}
