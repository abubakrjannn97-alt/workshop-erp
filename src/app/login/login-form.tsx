"use client";

import Link from "next/link";
import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { loginAction } from "@/app/actions/auth";
import { createT, type Locale } from "@core/shared/i18n/i18n";
import styles from "./login-form.module.css";

function SubmitButton({ t, labelKey }: { t: (k: string) => string; labelKey: string }) {
  const { pending } = useFormStatus();
  return (
    <button type="submit" disabled={pending} aria-busy={pending} className="ui-btn-primary mt-6 w-full">
      {pending ? t("login.pending") : t(labelKey)}
    </button>
  );
}

export function OwnerLoginForm({ locale }: { locale: Locale }) {
  const t = createT(locale);
  const [state, action] = useActionState(loginAction, undefined);

  return (
    <div className={styles.loginCard}>
      <div className="mb-4 h-px w-8 bg-[var(--line)]" />
      <h1 className="page-title">{t("login.title")}</h1>
      <p className="mt-1 text-sm text-[var(--muted)]">{t("login.subtitleOwner")}</p>

      <form action={action} className={styles.form}>
        <input type="hidden" name="loginMode" value="admin" />

        <label className="ui-label">{t("login.email")}</label>
        <input
          name="email"
          type="email"
          required
          autoComplete="username"
          placeholder="owner@workshop.local"
          className="ui-input"
        />

        <label className="ui-label mt-3">{t("login.password")}</label>
        <input
          name="password"
          type="password"
          required
          autoComplete="current-password"
          className="ui-input"
        />

        {state?.error ? <p className={styles.error}>{state.error}</p> : null}

        <SubmitButton t={t} labelKey="login.submit" />
      </form>

      <p className="mt-4 text-center text-sm">
        <Link href="/login/staff" className="font-medium text-[var(--titan-dark)] underline-offset-2 hover:underline">
          {t("login.staffLink")}
        </Link>
      </p>
    </div>
  );
}

export function StaffLoginForm({ locale }: { locale: Locale }) {
  const t = createT(locale);
  const [state, action] = useActionState(loginAction, undefined);

  return (
    <div className={styles.loginCard}>
      <div className="mb-4 h-px w-8 bg-[var(--line)]" />
      <h1 className="page-title">{t("login.staffTitle")}</h1>
      <p className="mt-1 text-sm text-[var(--muted)]">{t("login.subtitleStaff")}</p>

      <form action={action} className={styles.form}>
        <input type="hidden" name="loginMode" value="employee" />

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
        <p className={styles.hint}>{t("login.pinHint")}</p>

        {state?.error ? <p className={styles.error}>{state.error}</p> : null}

        <SubmitButton t={t} labelKey="login.submit" />
      </form>

      <p className="mt-4 text-center text-sm">
        <Link href="/login" className="font-medium text-[var(--titan-dark)] underline-offset-2 hover:underline">
          {t("login.ownerLink")}
        </Link>
      </p>
    </div>
  );
}
