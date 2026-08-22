"use client";

import { useState, useTransition } from "react";
import { LanguageSwitcher } from "@/components/language-switcher";
import { LogoutButton } from "@/components/logout-button";
import { PendingButton } from "@/components/pending-button";
import { updateMyProfile } from "@/app/actions/profile";
import type { Locale } from "@core/shared/i18n/i18n";
import { translate } from "@core/shared/i18n/i18n";
import { WorkerPageHeader } from "@/components/worker-page-header";
import styles from "./worker-pages.module.css";

export function WorkerProfileView({
  title,
  locale,
  name,
  phone,
  roleLabel,
}: {
  title: string;
  locale: Locale;
  name: string;
  phone: string;
  roleLabel: string;
}) {
  const t = (key: string) => translate(locale, key);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function onSave(formData: FormData) {
    setSaved(false);
    setError(null);
    startTransition(async () => {
      const result = await updateMyProfile(formData);
      if (result?.error) {
        setError(result.error);
        return;
      }
      setSaved(true);
    });
  }

  return (
    <div className={styles.page}>
      <WorkerPageHeader title={title} />
      <div className={styles.profileCard}>
        <div className={styles.profileLang}>
          <span className={styles.profileLabel}>{t("lang.switch")}</span>
          <LanguageSwitcher locale={locale} size="sm" />
        </div>

        <div>
          <p className={styles.profileName}>{name}</p>
          <p className={styles.profileRole}>{roleLabel}</p>
        </div>

        <form action={onSave} className={styles.profileForm}>
          <label className={styles.profileLabel} htmlFor="profile-name">
            {t("common.name")}
          </label>
          <input id="profile-name" name="name" required defaultValue={name} className="ui-input" />

          <label className={styles.profileLabel} htmlFor="profile-phone">
            {t("common.phone")}
          </label>
          <input
            id="profile-phone"
            name="phone"
            defaultValue={phone}
            className="ui-input"
            inputMode="tel"
            placeholder="+992 ..."
          />

          {error ? <p className={styles.profileError}>{error}</p> : null}
          {saved ? <p className={styles.profileSaved}>{t("me.profileSaved")}</p> : null}

          <PendingButton className="ui-btn-primary min-h-[44px] w-full" pendingLabel={t("common.saving")}>
            {t("common.save")}
          </PendingButton>
        </form>

        <LogoutButton label={t("nav.logout")} className="min-h-[44px] w-full" />
      </div>
    </div>
  );
}
