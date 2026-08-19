import { getTranslator, intlLocale } from "@core/shared/i18n/locale";
import { prisma } from "@core/infrastructure/prisma";
import { requirePermission, hasPermission } from "@core/auth/authz";
import { decideApproval, closePeriod } from "@/app/actions/control";
import { SettingsNav } from "@/components/settings-nav";
import { FormField } from "@/components/form-field";
import { StatusBadge } from "@/components/status-badge";
import styles from "@/styles/premium.module.css";

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

  async function decide(formData: FormData) { "use server"; await decideApproval(formData); }
  async function close(formData: FormData) { "use server"; await closePeriod(formData); }

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <div className={styles.headerText}><h1 className={styles.title}>{t("set.approvalsTitle")}</h1></div>
      </header>
      <SettingsNav current="approvals" locale={locale} />

      <section className={styles.section}>
        <div className={styles.sectionHead}><h2 className={styles.sectionTitle}>{t("set.pending")}</h2></div>
        <div className={styles.sectionBody}>
          {pending.length === 0 ? (
            <p style={{ fontSize: 14, color: "var(--ink-3)" }}>{t("set.noRequests")}</p>
          ) : (
            <ul style={{ margin: 0, padding: 0, listStyle: "none" }}>
              {pending.map((a) => (
                <li key={a.id} style={{ padding: 12, border: "1px solid var(--line)", borderRadius: 10, marginBottom: 10 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", gap: 8, flexWrap: "wrap", alignItems: "flex-start" }}>
                    <div><p style={{ fontWeight: 600, fontSize: 14, color: "var(--ink)" }}>{a.title}</p><p style={{ fontSize: 12, color: "var(--ink-3)", marginTop: 2 }}>{a.type} · {a.createdAt.toLocaleString(intlLocale(locale))}{a.reason ? ` · ${a.reason}` : ""}</p></div>
                    <StatusBadge label={a.status} tone={approvalTone(a.status)} />
                  </div>
                  {canDecide ? (
                    <div className="mt-2 flex flex-wrap gap-2">
                      <form action={decide}><input type="hidden" name="id" value={a.id} /><input type="hidden" name="decision" value="APPROVED" /><button type="submit" className="ui-btn-primary min-h-[44px]">{t("common.confirm")}</button></form>
                      <form action={decide}><input type="hidden" name="id" value={a.id} /><input type="hidden" name="decision" value="REJECTED" /><button type="submit" className="ui-btn-danger min-h-[44px]">{t("common.reject")}</button></form>
                    </div>
                  ) : null}
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>

      {canDecide ? (
        <section className={styles.section}>
          <div className={styles.sectionHead}><h2 className={styles.sectionTitle}>{t("set.closePeriod")}</h2></div>
          <div className={styles.sectionBody}>
            <form action={close} className="flex flex-wrap items-end gap-2">
              <FormField label={t("home.periodYear")} className="min-w-[6rem]"><input name="year" defaultValue={String(now.getFullYear())} className="ui-input" inputMode="numeric" /></FormField>
              <FormField label={t("home.periodMonth")} className="min-w-[5rem]"><input name="month" defaultValue={String(now.getMonth() + 1)} className="ui-input" inputMode="numeric" /></FormField>
              <button type="submit" className="ui-btn-primary min-h-[44px]">{t("set.closeMonth")}</button>
            </form>
            <ul style={{ marginTop: 12, fontSize: 12, color: "var(--ink-3)", listStyle: "none", padding: 0 }}>
              {periods.map((p) => <li key={p.id}>{p.month}.{p.year}: {p.status}</li>)}
            </ul>
          </div>
        </section>
      ) : null}

      <section className={styles.section}>
        <div className={styles.sectionHead}><h2 className={styles.sectionTitle}>{t("common.history")}</h2></div>
        {recent.length === 0 ? (
          <div className={styles.empty}>{t("common.empty")}</div>
        ) : (
          <div className={styles.tableWrap}>
            <table className={styles.table}>
              <thead><tr><th>{t("common.status")}</th><th>{t("list.col.what")}</th><th className={styles.thRight}>{t("list.col.when")}</th></tr></thead>
              <tbody>
                {recent.map((a) => (
                  <tr key={a.id}>
                    <td><StatusBadge label={a.status} tone={approvalTone(a.status)} /></td>
                    <td><span className={styles.tdBold}>{a.title}</span><p className={styles.tdMuted}>{a.type}</p></td>
                    <td className={styles.tdRight} style={{ fontSize: 12, color: "var(--ink-3)" }}>{a.createdAt.toLocaleString(intlLocale(locale))}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
