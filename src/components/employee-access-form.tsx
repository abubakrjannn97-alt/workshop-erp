"use client";

import { useActionState } from "react";
import { updateEmployeeAccess } from "@/app/actions/employees";
import { FormField } from "@/components/form-field";
import { PendingButton } from "@/components/pending-button";
import { createT, type Locale } from "@core/shared/i18n/i18n";
import type { PermissionCode } from "@core/rbac/permissions";
import type { PermissionOption } from "@/components/add-employee-form";

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

  return (
    <form action={action} className="ui-card space-y-4 p-4">
      <input type="hidden" name="id" value={userId} />
      <h2 className="text-sm font-semibold">{t("emp.accessTitle")}</h2>
      <p className="text-sm text-[var(--text-muted)]">{t("emp.accessHint")}</p>

      <FormField label={t("emp.newPin")} hint={t("emp.newPinHint")} className="max-w-xs">
        <input
          name="pin"
          type="password"
          inputMode="numeric"
          pattern="\d{4,6}"
          maxLength={6}
          autoComplete="one-time-code"
          className="ui-input font-mono"
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

      <PendingButton className="ui-btn-primary w-full sm:w-auto" pendingLabel={t("common.saving")}>
        {t("emp.saveAccess")}
      </PendingButton>
    </form>
  );
}
