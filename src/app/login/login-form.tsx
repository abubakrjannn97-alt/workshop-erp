"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { loginAction } from "@/app/actions/auth";
import { createT, type Locale } from "@/lib/i18n";

function SubmitButton({ t }: { t: (k: string) => string }) {
  const { pending } = useFormStatus();
  return (
    <button type="submit" disabled={pending} aria-busy={pending} className="ui-btn-primary mt-6 w-full">
      {pending ? t("login.pending") : t("login.submit")}
    </button>
  );
}

export function LoginForm({ locale }: { locale: Locale }) {
  const t = createT(locale);
  const [state, action] = useActionState(loginAction, undefined);

  return (
    <form action={action} className="ui-card-solid w-full max-w-sm p-6">
      <div className="mb-4 h-px w-8 bg-[var(--line)]" />
      <h1 className="page-title">{t("login.title")}</h1>
      <p className="mt-1 text-sm text-[var(--muted)]">{t("login.subtitle")}</p>

      <label className="ui-label mt-5">{t("login.email")}</label>
      <input name="email" type="email" required autoComplete="username" className="ui-input" />

      <label className="ui-label mt-3">{t("login.password")}</label>
      <input
        name="password"
        type="password"
        required
        autoComplete="current-password"
        className="ui-input"
      />

      {state?.error ? <p className="mt-3 text-sm text-[var(--danger)]">{state.error}</p> : null}

      <SubmitButton t={t} />
    </form>
  );
}
