"use client";

import { useActionState, useState } from "react";
import { useFormStatus } from "react-dom";
import { loginAction } from "@/app/actions/auth";
import { createT, type Locale } from "@/lib/i18n";

function SubmitButton({ t, labelKey }: { t: (k: string) => string; labelKey: string }) {
  const { pending } = useFormStatus();
  return (
    <button type="submit" disabled={pending} aria-busy={pending} className="ui-btn-primary mt-6 w-full">
      {pending ? t("login.pending") : t(labelKey)}
    </button>
  );
}

type LoginMode = "employee" | "admin";

export function LoginForm({ locale }: { locale: Locale }) {
  const t = createT(locale);
  const [mode, setMode] = useState<LoginMode>("employee");
  const [state, action] = useActionState(loginAction, undefined);

  return (
    <div className="ui-card-solid w-full max-w-sm p-6">
      <div className="mb-4 h-px w-8 bg-[var(--line)]" />
      <h1 className="page-title">{t("login.title")}</h1>
      <p className="mt-1 text-sm text-[var(--muted)]">{t("login.subtitle")}</p>

      <div className="mt-5 flex rounded-lg bg-[var(--surface-muted)] p-1">
        <button
          type="button"
          onClick={() => setMode("employee")}
          className={`flex-1 rounded-md py-2 text-sm font-medium transition-colors ${
            mode === "employee"
              ? "bg-white text-[var(--titan-dark)] shadow-sm"
              : "text-[var(--muted)]"
          }`}
        >
          {t("login.modeEmployee")}
        </button>
        <button
          type="button"
          onClick={() => setMode("admin")}
          className={`flex-1 rounded-md py-2 text-sm font-medium transition-colors ${
            mode === "admin"
              ? "bg-white text-[var(--titan-dark)] shadow-sm"
              : "text-[var(--muted)]"
          }`}
        >
          {t("login.modeAdmin")}
        </button>
      </div>

      <form action={action} className="mt-4">
        <input type="hidden" name="loginMode" value={mode} />

        {mode === "employee" ? (
          <>
            <label className="ui-label">{t("login.phone")}</label>
            <input
              name="phone"
              type="tel"
              required
              autoComplete="tel"
              inputMode="tel"
              placeholder="+992 90 123 4567"
              className="ui-input"
            />

            <label className="ui-label mt-3">{t("login.pin")}</label>
            <input
              name="pin"
              type="password"
              required
              autoComplete="one-time-code"
              inputMode="numeric"
              pattern="\d{4,6}"
              maxLength={6}
              placeholder="••••"
              className="ui-input font-mono tracking-widest"
            />
            <p className="mt-1 text-xs text-[var(--muted)]">{t("login.pinHint")}</p>
          </>
        ) : (
          <>
            <label className="ui-label">{t("login.email")}</label>
            <input name="email" type="email" required autoComplete="username" className="ui-input" />

            <label className="ui-label mt-3">{t("login.password")}</label>
            <input
              name="password"
              type="password"
              required
              autoComplete="current-password"
              className="ui-input"
            />
          </>
        )}

        {state?.error ? <p className="mt-3 text-sm text-[var(--danger)]">{state.error}</p> : null}

        <SubmitButton t={t} labelKey="login.submit" />
      </form>
    </div>
  );
}
