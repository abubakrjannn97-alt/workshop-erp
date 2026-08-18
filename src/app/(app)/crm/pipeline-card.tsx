"use client";

import { LOST_REASONS } from "@core/orders/orders";
import { createT, named, type Locale } from "@/lib/i18n";

type Stage = { id: string; code: string; name: string; isLost: boolean };

export function PipelineCard({
  lead,
  stages,
  action,
  locale,
  accent = "#64748B",
  glow = "rgba(100, 116, 139, 0.12)",
}: {
  lead: { id: string; name: string; phone?: string | null; stageId: string };
  stages: Stage[];
  action: (formData: FormData) => Promise<void>;
  locale: Locale;
  accent?: string;
  glow?: string;
}) {
  const t = createT(locale);
  return (
    <form
      action={action}
      className="rounded-lg border p-3 text-sm"
      style={{
        borderColor: `${accent}44`,
        background: "linear-gradient(180deg, #ffffff 0%, #fafbfc 100%)",
        boxShadow: `0 0 14px ${glow}`,
      }}
    >
      <input type="hidden" name="id" value={lead.id} />
      <p className="font-medium">{lead.name}</p>
      <select
        name="stageId"
        defaultValue={lead.stageId}
        className="mt-2 w-full rounded border border-[var(--border)] bg-white px-2 py-1 text-xs"
      >
        {stages.map((s) => (
          <option key={s.id} value={s.id}>
            {named(locale, "lead", s.code, s.name)}
          </option>
        ))}
      </select>
      <select name="lostReason" className="mt-1 w-full rounded border border-[var(--border)] bg-white px-2 py-1 text-xs">
        <option value="">{t("crm.lostReason")}</option>
        {LOST_REASONS.map((r) => (
          <option key={r.code} value={r.code}>
            {t(`lost.${r.code}`)}
          </option>
        ))}
      </select>
      <button type="submit" className="mt-2 text-xs font-medium hover:underline" style={{ color: accent }}>
        {t("crm.move")}
      </button>
    </form>
  );
}
