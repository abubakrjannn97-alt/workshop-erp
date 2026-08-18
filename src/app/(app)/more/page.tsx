import Link from "next/link";
import { redirect } from "next/navigation";
import { requireSession } from "@core/auth/authz";
import { getTranslator } from "@core/shared/i18n/locale";
import { PageHeader } from "@/components/page-header";
import { LogoutButton } from "@/components/logout-button";
import { moreGroupsForRole } from "@core/shared/nav";
import { NavIconGlyph } from "@/components/nav-icons";

export default async function MorePage() {
  const session = await requireSession();
  const { t } = await getTranslator();
  if (session.user.roleCode === "worker") redirect("/me");

  const groups = moreGroupsForRole(session.user.roleCode, session.user.permissions);

  return (
    <div className="mx-auto max-w-lg space-y-5 pb-8">
      <PageHeader title={t("nav.more")} description={t("nav.moreHint")} />

      {groups.map((g) => (
        <section key={g.id}>
          <h2 className="px-1 pb-2 text-[13px] font-semibold text-[var(--ink-2)]">
            {t(g.labelKey ?? "nav.more")}
          </h2>
          <ul className="overflow-hidden rounded-[var(--radius-card)] border border-[var(--line)] bg-[var(--surface)]">
            {g.items.map((item) => (
              <li key={item.href} className="border-t border-[var(--line)] first:border-t-0">
                <Link
                  href={item.href}
                  prefetch
                  className="flex min-h-12 items-center gap-3 px-4 text-[15px] text-[var(--ink)] hover:bg-[var(--surface-2)]"
                >
                  <span className="text-[var(--ink-2)]">
                    <NavIconGlyph icon={item.icon} size={20} />
                  </span>
                  <span className="flex-1 font-medium">{t(item.labelKey)}</span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      ))}

      <section className="rounded-[var(--radius-card)] border border-[var(--line)] bg-[var(--surface)] px-4 py-4">
        <p className="text-[15px] font-semibold text-[var(--ink)]">{session.user.name}</p>
        <p className="text-[13px] text-[var(--ink-2)]">{session.user.roleName}</p>
        <Link href="/me/profile" className="mt-3 inline-block text-[14px] font-medium text-[var(--navy)]">
          {t("nav.profile")}
        </Link>
        <div className="mt-3">
          <LogoutButton label={t("nav.logout")} />
        </div>
      </section>
    </div>
  );
}
