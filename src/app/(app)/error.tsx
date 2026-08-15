"use client";

import { createT, getClientLocale } from "@/lib/i18n";
import { CircleAlert } from "lucide-react";

export default function AppError({
  error,
  reset,
}: {
  error: Error;
  reset: () => void;
}) {
  const t = createT(getClientLocale());
  return (
    <div className="mx-auto flex max-w-md flex-col items-center gap-3 rounded-[16px] border border-[var(--color-border)] bg-white p-8 text-center shadow-card">
      <span className="inline-flex h-11 w-11 items-center justify-center rounded-xl border border-[var(--color-danger)]/30 bg-[var(--color-danger)]/10 text-[var(--color-danger)]">
        <CircleAlert size={20} strokeWidth={1.5} />
      </span>
      <h1 className="text-lg font-semibold text-[var(--color-text-primary)]">{t("error.title")}</h1>
      <p className="text-sm text-[var(--color-text-muted)]">
        {process.env.NODE_ENV === "development"
          ? error.message
          : t("error.generic")}
      </p>
      <button type="button" onClick={reset} className="ui-btn-primary mt-2">
        {t("error.retry")}
      </button>
    </div>
  );
}
