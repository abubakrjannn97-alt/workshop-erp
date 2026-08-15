"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { updateEmployeeAccess } from "@/app/actions/employees";
import { createT, type Locale } from "@/lib/i18n";
import type { PermissionCode } from "@/lib/permissions";
import type { PermissionOption } from "@/components/add-employee-form";

type Props = {
  locale: Locale;
  userId: string;
  permissions: PermissionOption[];
  modules: string[];
  selectedCodes: PermissionCode[];
};

function SubmitButton({ t }: { t: (k: string) => string }) {
  const { pending } = useFormStatus();
  return (
    <button type="submit" disabled={pending} className="ui-btn-primary">
      {pending ? t("common.saving") : t("emp.saveAccess")}
    </button>
  );
}

export function EmployeeAccessForm({ locale, userId, permissions, modules, selectedCodes }: Props) {
  const t = createT(locale);
  const selected = new Set(selectedCodes);
  const [state, action] = useActionState(updateEmployeeAccess, undefined);

  return (
    <form action={action} className="ui-card p-4">
      <input type="hidden" name="id" value={userId} />
      <h2 className="text-sm font-semibold">{t("emp.accessTitle")}</h2>
      <p className="mt-1 text-sm text-[var(--text-muted)]">{t("emp.accessHint")}</p>

      <label className="mt-4 block max-w-xs text-sm">
        <span className="ui-label mb-1">{t("emp.newPin")}</span>
        <input
          name="pin"
          type="password"
          inputMode="numeric"
          pattern="\d{4,6}"
          maxLength={6}
          placeholder="••••"
          className="ui-input font-mono"
        />
        <span className="mt-1 block text-xs text-[var(--muted)]">{t("emp.newPinHint")}</span>
      </label>

      <div className="mt-4 max-h-[min(20rem,45vh)] space-y-4 overflow-y-auto pr-1">
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
                    className="flex items-start gap-2 rounded-lg border border-[var(--border)] p-2.5 text-sm"
                  >
                    <input
                      type="checkbox"
                      name="permissionCode"
                      value={perm.code}
                      defaultChecked={selected.has(perm.code)}
                      className="mt-0.5"
                    />
                    <span>{t(`perm.${perm.code}`)}</span>
                  </label>
                ))}
              </div>
            </div>
          );
        })}
      </div>

      {state?.error ? <p className="mt-3 text-sm text-[var(--danger)]">{state.error}</p> : null}
      {state?.ok ? <p className="mt-3 text-sm text-[var(--success)]">{t("emp.accessSaved")}</p> : null}

      <div className="mt-4">
        <SubmitButton t={t} />
      </div>
    </form>
  );
}
