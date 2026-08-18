import { PageHeader } from "@/components/page-header";
import { getTranslator } from "@core/shared/i18n/locale";
import { readFile } from "fs/promises";
import path from "path";
import { requirePermission } from "@core/auth/authz";
import { SettingsNav } from "@/components/settings-nav";
import { DashPanel } from "@/components/dash-panel";
import { StatusBadge } from "@/components/status-badge";
import {
  DataList,
  DataListCell,
  DataListEmpty,
  DataListHead,
  DataListHeadCell,
  DataListPrimary,
  DataListRow,
  dataListStyles,
} from "@/components/data-table";

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
      <PageHeader title={t("set.backupsTitle")} description={t("set.backupsHint")} />
      <SettingsNav current="backups" locale={locale} />

      <DashPanel title={t("set.backupsTitle")}>
        {rows.length === 0 ? (
          <DataListEmpty>{t("set.noBackupLog")}</DataListEmpty>
        ) : (
          <DataList layout="cols3">
            <DataListHead layout="cols3">
              <DataListHeadCell>{t("common.status")}</DataListHeadCell>
              <DataListHeadCell>{t("list.col.when")}</DataListHeadCell>
              <DataListHeadCell>{t("list.col.what")}</DataListHeadCell>
            </DataListHead>
            <ul className={dataListStyles.rows}>
              {rows.map((r, i) => (
                <DataListRow key={i} layout="cols3">
                  <DataListCell label={t("common.status")}>
                    <StatusBadge
                      label={r.ok ? t("set.success") : t("set.fail")}
                      tone={r.ok ? "good" : "bad"}
                    />
                  </DataListCell>
                  <DataListCell label={t("list.col.when")}>
                    <span className="text-xs text-[var(--muted)]">{r.at ?? "—"}</span>
                  </DataListCell>
                  <DataListPrimary
                    title={r.file ?? "—"}
                    subtitle={[r.size != null ? `${r.size} B` : null, r.error].filter(Boolean).join(" · ") || undefined}
                  />
                </DataListRow>
              ))}
            </ul>
          </DataList>
        )}
      </DashPanel>
    </div>
  );
}
