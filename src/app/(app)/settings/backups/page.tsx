import { readFile } from "fs/promises";
import path from "path";
import { requirePermission } from "@/lib/authz";

type Entry = { at?: string; file?: string; ok?: boolean; error?: string; size?: number };

export default async function BackupsPage() {
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
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Резервные копии</h1>
        <p className="mt-1 text-sm text-slate-600">
          Ежедневный backup: <code>npm run db:backup</code>. Восстановление:{" "}
          <code>npm run db:restore</code>. Retention 14 копий, журнал успешности ниже.
        </p>
      </div>
      <section className="rounded-2xl border border-[var(--line)] bg-white">
        <ul className="divide-y divide-slate-100 text-sm">
          {rows.length === 0 ? (
            <li className="px-5 py-6 text-slate-500">Записей журнала нет. Запустите backup.</li>
          ) : (
            rows.map((r, i) => (
              <li key={i} className="px-5 py-3">
                <p className={r.ok ? "font-medium text-teal-800" : "font-medium text-red-800"}>
                  {r.ok ? "Успешно" : "Ошибка"} · {r.at ?? "—"}
                </p>
                <p className="text-xs text-slate-500">
                  {r.file ?? "—"} · {r.size ?? 0} байт {r.error ? `· ${r.error}` : ""}
                </p>
              </li>
            ))
          )}
        </ul>
      </section>
    </div>
  );
}
