"use client";

import { useState, useTransition } from "react";
import { devQuickLoginAction } from "@/app/actions/auth";
import { createT, type Locale } from "@/lib/i18n";

type DemoUser = { email: string; roleCode: string; name: string };

export function DevRolePicker({ locale, users }: { locale: Locale; users: DemoUser[] }) {
  const t = createT(locale);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | undefined>();

  if (users.length === 0) return null;

  return (
    <div className="mt-4 w-full max-w-sm rounded-xl border border-dashed border-[var(--line)] bg-white/60 p-4 backdrop-blur-sm">
      <p className="text-xs font-semibold uppercase tracking-wide text-[var(--muted)]">
        {t("login.devRolesTitle")}
      </p>
      <p className="mt-1 text-xs text-[var(--muted)]">{t("login.devRolesHint")}</p>
      <ul className="mt-3 space-y-1.5">
        {users.map((user) => (
          <li key={user.email}>
            <button
              type="button"
              disabled={pending}
              onClick={() => {
                setError(undefined);
                startTransition(async () => {
                  const result = await devQuickLoginAction(user.email);
                  if (result?.error) setError(result.error);
                });
              }}
              className="flex w-full items-center justify-between rounded-lg border border-[var(--line)] bg-white px-3 py-2 text-left text-sm transition hover:border-[var(--color-gold)] hover:bg-[var(--color-background)] disabled:opacity-50"
            >
              <span className="font-medium">{t(`role.${user.roleCode}`)}</span>
              <span className="truncate pl-2 font-mono text-[10px] text-[var(--muted)]">{user.email}</span>
            </button>
          </li>
        ))}
      </ul>
      {error ? <p className="mt-2 text-xs text-[var(--danger)]">{error}</p> : null}
      <p className="mt-3 font-mono text-[10px] text-[var(--muted)]">{t("login.devPasswordHint")}</p>
    </div>
  );
}
