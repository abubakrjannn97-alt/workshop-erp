"use client";

import { useEffect, useMemo, useState } from "react";
import type { Locale } from "@/lib/i18n";
import { createT } from "@/lib/i18n";
import { HELP_REPLAY, HELP_RESTORE, helpFaq } from "@/lib/help";

export function HelpFaq({ locale }: { locale: Locale }) {
  const t = createT(locale);
  const items = useMemo(() => helpFaq(locale), [locale]);
  const [q, setQ] = useState("");
  const [openId, setOpenId] = useState<string | null>(null);

  useEffect(() => {
    const hash = typeof window !== "undefined" ? window.location.hash.replace("#", "") : "";
    if (hash && items.some((i) => i.id === hash)) setOpenId(hash);
  }, [items]);

  const filtered = items.filter((i) => {
    const s = q.trim().toLowerCase();
    if (!s) return true;
    return i.q.toLowerCase().includes(s) || i.a.toLowerCase().includes(s);
  });

  function toggle(id: string) {
    setOpenId((cur) => (cur === id ? null : id));
    if (typeof window !== "undefined") {
      history.replaceState(null, "", id ? `/help#${id}` : "/help");
    }
  }

  return (
    <div className="mx-auto max-w-2xl space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="page-title">{t("help.faqTitle")}</h1>
          <p className="mt-1 text-[13px] text-[var(--text-muted)]">{t("help.faqLead")}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            className="ui-btn-secondary h-8 px-3 text-[12px]"
            onClick={() => window.dispatchEvent(new Event(HELP_REPLAY))}
          >
            {t("help.replay")}
          </button>
          <button
            type="button"
            className="ui-btn-secondary h-8 px-3 text-[12px]"
            onClick={() => window.dispatchEvent(new Event(HELP_RESTORE))}
          >
            {t("help.restore")}
          </button>
        </div>
      </div>

      <input
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder={t("help.searchFaq")}
        className="ui-input"
        aria-label={t("help.searchFaq")}
      />

      <ul className="ui-card divide-y divide-[var(--line)] overflow-hidden">
        {filtered.length === 0 ? (
          <li className="px-4 py-6 text-center text-[13px] text-[var(--muted)]">{t("common.empty")}</li>
        ) : (
          filtered.map((item) => {
            const open = openId === item.id;
            return (
              <li key={item.id} id={item.id}>
                <button
                  type="button"
                  aria-expanded={open}
                  onClick={() => toggle(item.id)}
                  className="flex w-full items-start justify-between gap-3 px-4 py-3 text-left hover:bg-[var(--bg-secondary)]"
                >
                  <span className="text-[13px] font-medium text-[var(--text)]">{item.q}</span>
                  <span className={`mt-0.5 shrink-0 text-[11px] text-[var(--muted)] transition-transform ${open ? "rotate-180" : ""}`}>
                    ▾
                  </span>
                </button>
                {open ? (
                  <p className="px-4 pb-3.5 pt-0 text-[13px] leading-relaxed text-[var(--text-muted)]">{item.a}</p>
                ) : null}
              </li>
            );
          })
        )}
      </ul>
    </div>
  );
}
