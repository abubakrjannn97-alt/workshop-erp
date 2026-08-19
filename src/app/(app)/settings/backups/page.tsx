import { getTranslator } from "@core/shared/i18n/locale";
import { readFile } from "fs/promises";
import path from "path";
import { requirePermission } from "@core/auth/authz";
import { SettingsNav } from "@/components/settings-nav";
import { StatusBadge } from "@/components/status-badge";
import styles from "@/styles/premium.module.css";

type Entry = { at?: string; file?: string; ok?: boolean; error?: string; size?: number };

export default async function BackupsPage() {
  const { t, locale } = await getTranslator();
  await requirePermission("settings.view");
  const journal = path.join(process.cwd(), ".data", "backups", "journal.jsonl");
  let rows: Entry[] = [];
  try { const text = await readFile(journal, "utf8"); rows = text.split(/\r?\n/).filter(Boolean).map((line) => JSON.parse(line) as Entry).reverse().slice(0, 30); } catch { rows = []; }

  return (
    <div className={styles.page}>
      <header className={styles.header}><div className={styles.headerText}><h1 className={styles.title}>{t("set.backupsTitle")}</h1><p className={styles.subtitle}>{t("set.backupsHint")}</p></div></header>
      <SettingsNav current="backups" locale={locale} />

      <section className={styles.section}>
        <div className={styles.sectionHead}><h2 className={styles.sectionTitle}>{t("set.backupsTitle")}</h2></div>
        {rows.length === 0 ? (
          <div className={styles.empty}>{t("set.noBackupLog")}</div>
        ) : (
          <div className={styles.tableWrap}>
            <table className={styles.table}>
              <thead><tr><th>{t("common.status")}</th><th>{t("list.col.when")}</th><th>{t("list.col.what")}</th></tr></thead>
              <tbody>
                {rows.map((r, i) => (
                  <tr key={i}>
                    <td><StatusBadge label={r.ok ? t("set.success") : t("set.fail")} tone={r.ok ? "good" : "bad"} /></td>
                    <td className={styles.tdMuted}>{r.at ?? "—"}</td>
                    <td><span className={styles.tdBold}>{r.file ?? "—"}</span>{r.error ? <p className={styles.tdMuted}>{r.error}</p> : null}{r.size != null ? <p className={styles.tdMuted}>{r.size} B</p> : null}</td>
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
