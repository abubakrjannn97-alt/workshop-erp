import Link from "next/link";
import { redirect } from "next/navigation";
import { requireSession } from "@/lib/authz";
import { getTranslator } from "@/lib/locale";
import { PageHeader } from "@/components/page-header";
import { LogoutButton } from "@/components/logout-button";
import { moreGroupsForRole } from "@/lib/nav";
import { NavIconGlyph } from "@/components/bottom-nav";

export default async function MorePage() {
  const session = await requireSession();
  const { t } = await getTranslator();
  if (session.user.roleCode === "worker") redirect("/me");

  const groups = moreGroupsForRole(session.user.roleCode, session.user.permissions);

  return (
    <div className="mx-auto max-w-lg space-y-3 pb-8">
      <PageHeader title={t("nav.more")} description={t("nav.moreHint")} />
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {groups.map((g) => (
          <Link
            key={g.id}
            href={`/more/${g.id}`}
            prefetch
            className="ui-card flex items-center gap-3 p-4 transition-colors hover:border-[var(--color-gold)]/40"
          >
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-[var(--color-gold)]/12 text-[var(--color-gold)]">
              <NavIconGlyph icon={g.items[0]?.icon ?? "more"} size={20} />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block text-[14px] font-semibold text-[#101828]">{t(g.labelKey ?? "nav.more")}</span>
              <span className="mt-0.5 block text-[12px] text-[#667085]">
                {g.items.length} · {t("nav.openGroup")}
              </span>
            </span>
            <span className="text-[#CBD5E1]">→</span>
          </Link>
        ))}
      </div>

      <section className="ui-card space-y-3 p-4">
        <div>
          <p className="text-sm font-semibold text-[#101828]">{session.user.name}</p>
          <p className="text-xs text-[#667085]">{session.user.roleName}</p>
        </div>
        <Link href="/me/profile" className="block text-sm font-medium text-[var(--titan-dark)]">
          {t("nav.profile")} →
        </Link>
        <LogoutButton label={t("nav.logout")} />
      </section>
    </div>
  );
}
