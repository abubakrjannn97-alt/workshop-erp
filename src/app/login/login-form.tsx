"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { loginAction } from "@/app/actions/auth";

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      aria-busy={pending}
      className="mt-6 w-full rounded-lg bg-teal-800 px-4 py-2.5 text-sm font-medium text-white disabled:opacity-60"
    >
      Войти
    </button>
  );
}

export function LoginForm() {
  const [state, action] = useActionState(loginAction, undefined);

  return (
    <form action={action} className="w-full max-w-sm rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
      <p className="text-xs font-medium uppercase tracking-[0.16em] text-teal-800">Производственный цех</p>
      <h1 className="mt-2 text-2xl font-semibold">Вход</h1>
      <p className="mt-2 text-sm text-slate-500">Только для сотрудников предприятия.</p>

      <label className="mt-6 block text-sm font-medium">Email</label>
      <input
        name="email"
        type="email"
        required
        autoComplete="username"
        className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none ring-teal-700 focus:ring-2"
      />

      <label className="mt-4 block text-sm font-medium">Пароль</label>
      <input
        name="password"
        type="password"
        required
        autoComplete="current-password"
        className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none ring-teal-700 focus:ring-2"
      />

      {state?.error ? <p className="mt-4 text-sm text-red-700">{state.error}</p> : null}

      <SubmitButton />
    </form>
  );
}
