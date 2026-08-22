"use client";

import { useActionState, useState } from "react";
import { updateEmployeeAccess } from "@/app/actions/employees";
import { FormField } from "@/components/form-field";
import { PendingButton } from "@/components/pending-button";
import { createT, type Locale } from "@core/shared/i18n/i18n";
import type { PermissionCode } from "@core/rbac/permissions";
import type { PermissionOption } from "@/components/add-employee-form";
import { ChevronDown } from "lucide-react";
import { ICON_STROKE } from "@/components/nav-icons";
import styles from "@/app/(app)/employees/employees.module.css";

type Props = {
  locale: Locale;
  userId: string;
  permissions: PermissionOption[];
  modules: string[];
  selectedCodes: PermissionCode[];
};

export function EmployeeAccessForm({ locale, userId, permissions, modules, selectedCodes }: Props) {
  const t = createT(locale);
  const selected = new Set(selectedCodes);
  const [state, action] = useActionState(updateEmployeeAccess, undefined);
  const [open, setOpen] = useState(false);

  return (
    <section className={styles.section}>
      <button
        type="button"
        className={styles.collapsibleHead}
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
      >
        <h2 className={styles.sectionTitle}>{t("emp.accessTitle")}</h2>
        <ChevronDown
          size={18}
          strokeWidth={ICON_STROKE}
          className={`${styles.collapsibleChevron} ${open ? styles.collapsibleChevronOpen : ""}`}
          aria-hidden
        />
      </button>
      {open ? (
        <form action={action} className={`${styles.sectionBody} grid gap-4`}>
          <input type="hidden" name="id" value={userId} />
          <p className="text-sm text-[var(--ink-2)]">{t("emp.accessHint")}</p>

          <FormField label={t("emp.newPin")} hint={t("emp.newPinHint")} className="max-w-xs">
            <input
              name="password"
              type="password"
              autoComplete="new-password"
              className="ui-input"
            />
          </FormField>

          <div className="max-h-[min(20rem,45vh)] space-y-4 overflow-y-auto pr-1">
            {modules.map((moduleName) => {
              const items = permissions.filter((p) => p.module === moduleName);
              if (items.length === 0) return null;
              return (
                <div key={moduleName}>
                  <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-[var(--muted)]">
                    {t(`mod.${moduleName}`)}
                  </p>
                  <div className="grid gap-2 sm:grid-cols-2">
                    {items.map((perm) => (
                      <label
                        key={perm.id}
                        className="flex min-h-11 items-start gap-2 rounded-lg border border-[var(--border)] p-2.5 text-sm"
                      >
                        <input
                          type="checkbox"
                          name="permissionCode"
                          value={perm.code}
                          defaultChecked={selected.has(perm.code)}
                          className="mt-1"
                        />
                        <span>{t(`perm.${perm.code}`)}</span>
                      </label>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>

          {state?.error ? (
            <p className="text-sm text-[var(--color-danger)]" role="alert">
              {state.error}
            </p>
          ) : null}
          {state?.ok ? <p className="text-sm text-[var(--success)]">{t("emp.accessSaved")}</p> : null}

          <PendingButton className="ui-btn-primary min-h-[44px] w-full sm:w-auto" pendingLabel={t("common.saving")}>
            {t("emp.saveAccess")}
          </PendingButton>
        </form>
      ) : null}
    </section>
  );
}
