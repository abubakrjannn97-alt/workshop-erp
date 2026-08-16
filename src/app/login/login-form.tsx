"use client";

import Link from "next/link";
import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { loginAction } from "@/app/actions/auth";
import { createT, type Locale } from "@/lib/i18n";
import styles from "./login-form.module.css";

export type LoginMode = "employee" | "admin";

function SubmitButton({ t, labelKey }: { t: (k: string) => string; labelKey: string }) {
  const { pending } = useFormStatus();
  return (
    <button type="submit" disabled={pending} aria-busy={pending} className="ui-btn-primary mt-6 w-full">
      {pending ? t("login.pending") : t(labelKey)}
    </button>
  );
}

export function LoginForm({ locale, mode }: { locale: Locale; mode: LoginMode }) {
  const t = createT(locale);
  const [state, action] = useActionState(loginAction, undefined);

  return (
    <div className={styles.loginCard}>
      <div className="mb-4 h-px w-8 bg-[var(--line)]" />
      <h1 className="page-title">{t("login.title")}</h1>
      <p className="mt-1 text-sm text-[var(--muted)]">{t("login.subtitle")}</p>

      <nav className={styles.tabs} aria-label={t("login.title")}>
        <Link
          href="/login?mode=admin"
          replace
          scroll={false}
          className={mode === "admin" ? styles.tabActive : styles.tab}
          aria-current={mode === "admin" ? "page" : undefined}
        >
          {t("login.modeAdmin")}
        </Link>
        <Link
          href="/login?mode=employee"
          replace
          scroll={false}
          className={mode === "employee" ? styles.tabActive : styles.tab}
          aria-current={mode === "employee" ? "page" : undefined}
        >
          {t("login.modeEmployee")}
        </Link>
      </nav>

      <form action={action} className={styles.form}>
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
            <p className={styles.hint}>{t("login.pinHint")}</p>
          </>
        ) : (
          <>
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
          </>
        )}

        {state?.error ? <p className={styles.error}>{state.error}</p> : null}

        <SubmitButton t={t} labelKey="login.submit" />
      </form>
    </div>
  );
}
