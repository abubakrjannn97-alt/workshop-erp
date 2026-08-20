"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { loginAction } from "@/app/actions/auth";
import { FormField } from "@/components/form-field";
import { createT, type Locale } from "@core/shared/i18n/i18n";
import styles from "./login-form.module.css";

function SubmitButton({ t }: { t: (k: string) => string }) {
  const { pending } = useFormStatus();
  return (
    <button type="submit" disabled={pending} aria-busy={pending || undefined} className="ui-btn-primary mt-6 w-full">
      {pending ? t("login.pending") : t("login.submit")}
    </button>
  );
}

export function OwnerLoginForm({ locale }: { locale: Locale }) {
  const t = createT(locale);
  const [state, action] = useActionState(loginAction, undefined);

  return (
    <div className={styles.loginCard}>
      <h1 className="page-title">{t("login.title")}</h1>
      <p className="page-subtitle">{t("login.subtitleOwner")}</p>

      <form action={action} className={styles.form}>
        <FormField label={t("login.phone")} required>
          <input
            name="phone"
            type="tel"
            required
            autoComplete="tel"
            inputMode="tel"
            placeholder="+992 …"
            className="ui-input"
          />
        </FormField>

        <FormField label={t("login.password")} required className="mt-3">
          <input
            name="password"
            type="password"
            autoComplete="current-password"
            className="ui-input"
          />
        </FormField>

        {state?.error ? (
          <p className={styles.error} role="alert">
            {state.error}
          </p>
        ) : null}

        <SubmitButton t={t} />
      </form>
    </div>
  );
}
