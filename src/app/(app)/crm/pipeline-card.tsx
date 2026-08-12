"use client";

import { LOST_REASONS } from "@/lib/orders";

type Stage = { id: string; code: string; name: string; isLost: boolean };

export function PipelineCard({
  lead,
  stages,
  action,
}: {
  lead: { id: string; name: string; phone: string | null; stageId: string };
  stages: Stage[];
  action: (formData: FormData) => Promise<void>;
}) {
  return (
    <form action={action} className="rounded-lg border border-slate-100 bg-slate-50 p-3 text-sm">
      <input type="hidden" name="id" value={lead.id} />
      <p className="font-medium">{lead.name}</p>
      {lead.phone ? <p className="text-xs text-slate-500">{lead.phone}</p> : null}
      <select
        name="stageId"
        defaultValue={lead.stageId}
        className="mt-2 w-full rounded border border-slate-200 bg-white px-2 py-1 text-xs"
      >
        {stages.map((s) => (
          <option key={s.id} value={s.id}>
            {s.name}
          </option>
        ))}
      </select>
      <select name="lostReason" className="mt-1 w-full rounded border border-slate-200 bg-white px-2 py-1 text-xs">
        <option value="">Причина, если проигран</option>
        {LOST_REASONS.map((r) => (
          <option key={r.code} value={r.code}>
            {r.name}
          </option>
        ))}
      </select>
      <button className="mt-2 text-xs font-medium text-[var(--titan-dark)] hover:underline">Переместить</button>
    </form>
  );
}
