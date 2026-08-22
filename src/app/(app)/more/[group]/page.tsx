import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { requireSession } from "@core/auth/authz";
import { hasWorkerShell } from "@core/worker/worker-shell";
import { getTranslator } from "@core/shared/i18n/locale";
import { PageHeader } from "@/components/page-header";
import { isMoreGroupId, moreGroupsForRole } from "@core/shared/nav";
import { NavIconGlyph } from "@/components/nav-icons";

export default async function MoreGroupPage({ params }: { params: Promise<{ group: string }> }) {
  const session = await requireSession();
  const { t } = await getTranslator();
  if (hasWorkerShell(session.user.roleCode, session.user.permissions)) redirect("/me");

  const { group: groupId } = await params;
  if (!isMoreGroupId(groupId)) notFound();

  const groups = moreGroupsForRole(session.user.roleCode, session.user.permissions);
  const group = groups.find((g) => g.id === groupId);
  if (!group) notFound();

  return (
    <div className="mx-auto max-w-lg space-y-3 pb-8">
      <PageHeader title={t(group.labelKey ?? "nav.more")} backHref="/" backLabel={t("common.back")} />
      <ul className="ui-card divide-y divide-[var(--line)] overflow-hidden">
        {group.items.map((item) => (
          <li key={item.href}>
            <Link
              href={item.href}
              prefetch
              className="flex min-h-12 items-center gap-3 px-4 py-3 text-[15px] text-[var(--color-text-primary)] hover:bg-[var(--color-surface-soft)]"
            >
              <span className="text-[var(--ink-2)]">
                <NavIconGlyph icon={item.icon} size={20} />
              </span>
              <span className="flex-1 font-medium">{t(item.labelKey)}</span>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
