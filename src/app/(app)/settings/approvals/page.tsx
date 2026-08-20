import { getTranslator, intlLocale } from "@core/shared/i18n/locale";
import { prisma } from "@core/infrastructure/prisma";
import { requirePermission, hasPermission } from "@core/auth/authz";
import { decideApproval, closePeriod, openPeriod } from "@/app/actions/control";
import { FormField } from "@/components/form-field";
import { StatusBadge } from "@/components/status-badge";
import styles from "@/styles/premium.module.css";

function approvalTone(status: string) {
  if (status === "APPROVED") return "good" as const;
  if (status === "REJECTED") return "bad" as const;
  if (status === "PENDING") return "warn" as const;
  return "neutral" as const;
}

function approvalStatusLabel(t: (k: string) => string, status: string) {
  if (status === "APPROVED") return t("set.apprApproved");
  if (status === "REJECTED") return t("set.apprRejected");
  if (status === "PENDING") return t("set.apprPending");
  return status;
}

function approvalTypeLabel(t: (k: string) => string, type: string) {
  const key = `set.apprType.${type}` as const;
  const mapped = t(key);
  return mapped === key ? type : mapped;
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
  async function open(formData: FormData) { "use server"; await openPeriod(formData); }

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <div className={styles.headerText}><h1 className={styles.title}>{t("set.approvalsTitle")}</h1></div>
      </header>

      {pending.length > 0 ? (
        <section className={styles.section}>
          <div className={styles.sectionHead}><h2 className={styles.sectionTitle}>{t("set.pending")}</h2></div>
          <div className={styles.sectionBody}>
            <ul style={{ margin: 0, padding: 0, listStyle: "none" }}>
              {pending.map((a) => (
                <li key={a.id} style={{ padding: 12, border: "1px solid var(--line)", borderRadius: 10, marginBottom: 10, background: "#fff" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", gap: 8, flexWrap: "wrap", alignItems: "flex-start" }}>
                    <div>
                      <p style={{ fontWeight: 600, fontSize: 14, color: "var(--ink)" }}>{a.title}</p>
                      <p style={{ fontSize: 12, color: "var(--ink-2)", marginTop: 2 }}>
                        {approvalTypeLabel(t, a.type)} · {a.createdAt.toLocaleString(intlLocale(locale))}
                        {a.reason ? ` · ${a.reason}` : ""}
                      </p>
                    </div>
                    <StatusBadge label={approvalStatusLabel(t, a.status)} tone={approvalTone(a.status)} />
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
          </div>
        </section>
      ) : null}

      {canDecide ? (
        <section className={styles.section}>
          <div className={styles.sectionHead}><h2 className={styles.sectionTitle}>{t("set.closePeriod")}</h2></div>
          <div className={styles.sectionBody}>
            <form action={close} className="flex flex-wrap items-end gap-2">
              <FormField label={t("home.periodYear")} className="min-w-[6rem]"><input name="year" defaultValue={String(now.getFullYear())} className="ui-input" inputMode="numeric" /></FormField>
              <FormField label={t("home.periodMonth")} className="min-w-[5rem]"><input name="month" defaultValue={String(now.getMonth() + 1)} className="ui-input" inputMode="numeric" /></FormField>
              <button type="submit" className="ui-btn-primary min-h-[44px]">{t("set.closeMonth")}</button>
            </form>
            <ul style={{ marginTop: 12, fontSize: 12, color: "var(--ink-2)", listStyle: "none", padding: 0 }}>
              {periods.map((p) => (
                <li key={p.id} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8, marginBottom: 6 }}>
                  <span>
                    {p.month}.{p.year}: {p.status === "CLOSED" ? t("set.periodClosed") : t("set.periodOpen")}
                  </span>
                  {p.status === "CLOSED" ? (
                    <form action={open}>
                      <input type="hidden" name="year" value={p.year} />
                      <input type="hidden" name="month" value={p.month} />
                      <button type="submit" className="ui-btn-secondary min-h-[36px] text-xs">
                        {t("set.openMonth")}
                      </button>
                    </form>
                  ) : null}
                </li>
              ))}
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
              <thead>
                <tr>
                  <th>{t("common.status")}</th>
                  <th>{t("list.col.what")}</th>
                  <th className={styles.thRight}>{t("list.col.when")}</th>
                </tr>
              </thead>
              <tbody>
                {recent.map((a) => (
                  <tr key={a.id}>
                    <td>
                      <StatusBadge label={approvalStatusLabel(t, a.status)} tone={approvalTone(a.status)} />
                    </td>
                    <td>
                      <span className={styles.tdBold}>{a.title}</span>
                      <p className={styles.tdMuted} style={{ color: "var(--ink-2)" }}>
                        {approvalTypeLabel(t, a.type)}
                      </p>
                    </td>
                    <td className={styles.tdRight} style={{ fontSize: 12, color: "var(--ink-2)", fontWeight: 500 }}>
                      {a.createdAt.toLocaleString(intlLocale(locale), {
                        day: "2-digit",
                        month: "2-digit",
                        year: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </td>
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
