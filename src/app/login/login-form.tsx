"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { loginAction } from "@/app/actions/auth";

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button type="submit" disabled={pending} aria-busy={pending} className="ui-btn-primary mt-6 w-full">
      {pending ? "…" : "Войти"}
    </button>
  );
}

export function LoginForm() {
  const [state, action] = useActionState(loginAction, undefined);

  return (
    <form action={action} className="ui-card w-full max-w-sm p-6">
      <h1 className="page-title">Вход</h1>
      <p className="mt-1 text-sm text-[var(--muted)]">Только для сотрудников</p>

      <label className="ui-label mt-5">Email</label>
      <input name="email" type="email" required autoComplete="username" className="ui-input" />

      <label className="ui-label mt-3">Пароль</label>
      <input
        name="password"
        type="password"
        required
        autoComplete="current-password"
        className="ui-input"
      />

      {state?.error ? <p className="mt-3 text-sm text-[var(--danger)]">{state.error}</p> : null}

      <SubmitButton />
    </form>
  );
}
