"use client";

import { LOST_REASONS } from "@core/orders/order-constants";
import { createT, named, type Locale } from "@core/shared/i18n/i18n";
import { AppSelect } from "@/components/app-select";

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
      <AppSelect
        name="stageId"
        defaultValue={lead.stageId}
        className="mt-2"
        options={stages.map((s) => ({ value: s.id, label: named(locale, "lead", s.code, s.name) }))}
      />
      <AppSelect
        name="lostReason"
        defaultValue=""
        className="mt-1"
        placeholder={t("crm.lostReason")}
        options={[
          { value: "", label: t("crm.lostReason") },
          ...LOST_REASONS.map((r) => ({ value: r.code, label: t(`lost.${r.code}`) })),
        ]}
      />
      <button type="submit" className="mt-2 text-xs font-medium hover:underline" style={{ color: accent }}>
        {t("crm.move")}
      </button>
    </form>
  );
}
