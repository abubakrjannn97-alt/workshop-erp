import { PageHeader } from "@/components/page-header";
import { getTranslator } from "@/lib/locale";
import { readFile } from "fs/promises";
import path from "path";
import { requirePermission } from "@core/auth/authz";

type Entry = { at?: string; file?: string; ok?: boolean; error?: string; size?: number };

export default async function BackupsPage() {
  const { t, locale } = await getTranslator();
  await requirePermission("settings.view");
  const journal = path.join(process.cwd(), ".data", "backups", "journal.jsonl");
  let rows: Entry[] = [];
  try {
    const text = await readFile(journal, "utf8");
    rows = text
      .split(/\r?\n/)
      .filter(Boolean)
      .map((line) => JSON.parse(line) as Entry)
      .reverse()
      .slice(0, 30);
  } catch {
    rows = [];
  }

  return (
    <div className="page-stack">
      <div>
        <PageHeader title={t("set.backupsTitle")} />
        <p className="mt-1 text-sm text-[var(--text-muted)]">{t("set.backupsHint")}</p>
      </div>
      <section className="ui-card">
        <ul className="divide-y divide-[var(--border)] text-sm">
          {rows.length === 0 ? (
            <li className="px-5 py-6 text-[var(--muted)]">{t("set.noBackupLog")}</li>
          ) : (
            rows.map((r, i) => (
              <li key={i} className="px-5 py-3">
                <p className={r.ok ? "font-medium text-[var(--titan-dark)]" : "font-medium text-[var(--danger)]"}>
                  {r.ok ? t("set.success") : t("set.fail")} · {r.at ?? "—"}
                </p>
                <p className="text-xs text-[var(--muted)]">
                  {r.file ?? "—"} · {r.size ?? 0} B {r.error ? `· ${r.error}` : ""}
                </p>
              </li>
            ))
          )}
        </ul>
      </section>
    </div>
  );
}
