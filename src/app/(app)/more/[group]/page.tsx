import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { requireSession } from "@/lib/authz";
import { getTranslator } from "@/lib/locale";
import { PageHeader } from "@/components/page-header";
import { isMoreGroupId, moreGroupsForRole } from "@/lib/nav";
import { NavIconGlyph } from "@/components/bottom-nav";

export default async function MoreGroupPage({ params }: { params: Promise<{ group: string }> }) {
  const session = await requireSession();
  const { t } = await getTranslator();
  if (session.user.roleCode === "worker") redirect("/me");

  const { group: groupId } = await params;
  if (!isMoreGroupId(groupId)) notFound();

  const groups = moreGroupsForRole(session.user.roleCode, session.user.permissions);
  const group = groups.find((g) => g.id === groupId);
  if (!group) notFound();

  return (
    <div className="mx-auto max-w-lg space-y-3 pb-8">
      <PageHeader title={t(group.labelKey ?? "nav.more")} />
      <Link href="/more" prefetch className="inline-block text-sm text-[var(--titan-dark)]">
        {t("common.back")}
      </Link>
      <ul className="ui-card divide-y divide-[var(--line)] overflow-hidden">
        {group.items.map((item) => (
          <li key={item.href}>
            <Link
              href={item.href}
              prefetch
              className="flex items-center gap-3 px-4 py-3 text-[14px] text-[var(--foreground)] hover:bg-[var(--bg-secondary)]"
            >
              <span className="text-[var(--color-gold)]">
                <NavIconGlyph icon={item.icon} size={18} />
              </span>
              <span className="flex-1 font-medium">{t(item.labelKey)}</span>
              <span className="text-[#CBD5E1]">→</span>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
