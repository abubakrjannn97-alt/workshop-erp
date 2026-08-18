import { PageHeader } from "@/components/page-header";
import { getTranslator, intlLocale } from "@core/shared/i18n/locale";
import { prisma } from "@core/infrastructure/prisma";
import { requirePermission } from "@core/auth/authz";
import { hasPermission } from "@core/auth/authz";
import { decideApproval, closePeriod } from "@/app/actions/control";
import { SettingsNav } from "@/components/settings-nav";
import { DashPanel } from "@/components/dash-panel";
import { FormField } from "@/components/form-field";
import { StatusBadge } from "@/components/status-badge";
import {
  DataList,
  DataListEmpty,
  DataListHead,
  DataListHeadCell,
  DataListPrimary,
  DataListRow,
  DataListCell,
  dataListStyles,
} from "@/components/data-table";

function approvalTone(status: string) {
  if (status === "APPROVED") return "good" as const;
  if (status === "REJECTED") return "bad" as const;
  if (status === "PENDING") return "warn" as const;
  return "neutral" as const;
}

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
      <PageHeader title={t("set.approvalsTitle")} />
      <SettingsNav current="approvals" locale={locale} />

      <DashPanel title={t("set.pending")}>
        {pending.length === 0 ? (
          <DataListEmpty>{t("set.noRequests")}</DataListEmpty>
        ) : (
          <ul className="space-y-3 text-sm">
            {pending.map((a) => (
              <li key={a.id} className="rounded-lg border border-[var(--line)] p-3">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <p className="font-medium">{a.title}</p>
                    <p className="text-xs text-[var(--muted)]">
                      {a.type} · {a.createdAt.toLocaleString(intlLocale(locale))}
                      {a.reason ? ` · ${a.reason}` : ""}
                    </p>
                  </div>
                  <StatusBadge label={a.status} tone={approvalTone(a.status)} />
                </div>
                {canDecide ? (
                  <div className="mt-2 flex flex-wrap gap-2">
                    <form action={decide}>
                      <input type="hidden" name="id" value={a.id} />
                      <input type="hidden" name="decision" value="APPROVED" />
                      <button type="submit" className="ui-btn-primary min-h-[44px]">
                        {t("common.confirm")}
                      </button>
                    </form>
                    <form action={decide}>
                      <input type="hidden" name="id" value={a.id} />
                      <input type="hidden" name="decision" value="REJECTED" />
                      <button type="submit" className="ui-btn-danger min-h-[44px]">
                        {t("common.reject")}
                      </button>
                    </form>
                  </div>
                ) : null}
              </li>
            ))}
          </ul>
        )}
      </DashPanel>

      {canDecide ? (
        <DashPanel title={t("set.closePeriod")}>
          <form action={close} className="ui-card flex flex-wrap items-end gap-2 p-3">
            <FormField label={t("home.periodYear")} className="min-w-[6rem]">
              <input name="year" defaultValue={String(now.getFullYear())} className="ui-input" inputMode="numeric" />
            </FormField>
            <FormField label={t("home.periodMonth")} className="min-w-[5rem]">
              <input name="month" defaultValue={String(now.getMonth() + 1)} className="ui-input" inputMode="numeric" />
            </FormField>
            <div className="flex items-end">
              <button type="submit" className="ui-btn-primary min-h-[44px]">
                {t("set.closeMonth")}
              </button>
            </div>
          </form>
            <ul className="mt-3 text-xs text-[var(--muted)]">
              {periods.map((p) => (
                <li key={p.id}>
                  {p.month}.{p.year}: {p.status}
                </li>
              ))}
            </ul>
        </DashPanel>
      ) : null}

      <DashPanel title={t("common.history")}>
        {recent.length === 0 ? (
          <DataListEmpty>{t("common.empty")}</DataListEmpty>
        ) : (
          <DataList layout="cols3">
            <DataListHead layout="cols3">
              <DataListHeadCell>{t("common.status")}</DataListHeadCell>
              <DataListHeadCell>{t("list.col.what")}</DataListHeadCell>
              <DataListHeadCell align="right">{t("list.col.when")}</DataListHeadCell>
            </DataListHead>
            <ul className={dataListStyles.rows}>
              {recent.map((a) => (
                <DataListRow key={a.id} layout="cols3">
                  <DataListCell label={t("common.status")}>
                    <StatusBadge label={a.status} tone={approvalTone(a.status)} />
                  </DataListCell>
                  <DataListPrimary title={a.title} subtitle={a.type} />
                  <DataListCell label={t("list.col.when")} align="right">
                    <span className="text-xs text-[var(--muted)]">
                      {a.createdAt.toLocaleString(intlLocale(locale))}
                    </span>
                  </DataListCell>
                </DataListRow>
              ))}
            </ul>
          </DataList>
        )}
      </DashPanel>
    </div>
  );
}
