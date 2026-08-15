import { PageHeader } from "@/components/page-header";
import { getTranslator, intlLocale } from "@/lib/locale";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/authz";
import { hasPermission } from "@/lib/authz";
import { decideApproval, closePeriod } from "@/app/actions/control";
import Link from "next/link";

export default async function ApprovalsPage() {
  const { t, locale } = await getTranslator();
  const session = await requirePermission("audit.view");
  const canDecide = hasPermission(session.user.permissions, session.user.roleCode, "approvals.decide");
  const [pending, recent, periods] = await Promise.all([
    prisma.approvalRequest.findMany({ where: { status: "PENDING" }, orderBy: { createdAt: "desc" } }),
    prisma.approvalRequest.findMany({ where: { status: { not: "PENDING" } }, orderBy: { createdAt: "desc" }, take: 20 }),
    prisma.accountingPeriod.findMany({ orderBy: [{ year: "desc" }, { month: "desc" }], take: 12 }),
  ]);
  const now = new Date();

  async function decide(formData: FormData) {
    "use server";
    await decideApproval(formData);
  }
  async function close(formData: FormData) {
    "use server";
    await closePeriod(formData);
  }

  return (
    <div className="page-stack">
      <div>
<PageHeader title={t("set.approvalsTitle")} />
      </div>
      <Link href="/settings" className="text-sm text-[var(--titan-dark)] hover:underline">
        {t("common.settingsBack")}
      </Link>

      <section className="ui-card">
        <h2 className="text-sm font-semibold">{t("set.pending")}</h2>
        <ul className="mt-3 space-y-3 text-sm">
          {pending.length === 0 ? (
            <li className="text-[var(--muted)]">{t("set.noRequests")}</li>
          ) : (
            pending.map((a) => (
              <li key={a.id} className="rounded-lg border border-[var(--line)] p-3">
                <p className="font-medium">{a.title}</p>
                <p className="text-xs text-[var(--muted)]">
                  {a.type} · {a.createdAt.toLocaleString(intlLocale(locale))}
                  {a.reason ? ` · ${a.reason}` : ""}
                </p>
                {canDecide ? (
                  <div className="mt-2 flex gap-2">
                    <form action={decide}>
                      <input type="hidden" name="id" value={a.id} />
                      <input type="hidden" name="decision" value="APPROVED" />
                      <button className="ui-btn-primary">{t("common.confirm")}</button>
                    </form>
                    <form action={decide}>
                      <input type="hidden" name="id" value={a.id} />
                      <input type="hidden" name="decision" value="REJECTED" />
                      <button className="ui-btn-danger">{t("common.reject")}</button>
                    </form>
                  </div>
                ) : null}
              </li>
            ))
          )}
        </ul>
      </section>

      {canDecide ? (
        <form action={close} className="flex flex-wrap items-end gap-2 ui-card">
          <h2 className="w-full text-sm font-semibold">{t("set.closePeriod")}</h2>
          <input
            name="year"
            defaultValue={String(now.getFullYear())}
            className="w-24 rounded-lg border border-[var(--border)] px-3 py-2 text-sm"
          />
          <input
            name="month"
            defaultValue={String(now.getMonth() + 1)}
            className="w-20 rounded-lg border border-[var(--border)] px-3 py-2 text-sm"
          />
          <button className="ui-btn-primary">{t("set.closeMonth")}</button>
          <ul className="w-full text-xs text-[var(--muted)]">
            {periods.map((p) => (
              <li key={p.id}>
                {p.month}.{p.year}: {p.status}
              </li>
            ))}
          </ul>
        </form>
      ) : null}

      <section className="ui-card">
        <h2 className="text-sm font-semibold">{t("common.history")}</h2>
        <ul className="mt-3 space-y-2 text-sm">
          {recent.map((a) => (
            <li key={a.id}>
              {a.status} · {a.title}
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
