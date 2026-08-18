"use client";

import { useActionState, useState } from "react";
import { createEmployee } from "@/app/actions/employees";
import { FormField } from "@/components/form-field";
import { PendingButton } from "@/components/pending-button";
import { createT, type Locale } from "@core/shared/i18n/i18n";
import type { PermissionCode } from "@core/rbac/permissions";

export type PermissionOption = {
  id: string;
  code: PermissionCode;
  module: string;
};

type Props = {
  locale: Locale;
  permissions: PermissionOption[];
  modules: string[];
};

export function AddEmployeeForm({ locale, permissions, modules }: Props) {
  const t = createT(locale);
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState<1 | 2>(1);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [pin, setPin] = useState("");
  const [state, action] = useActionState(createEmployee, undefined);

  function resetForm() {
    setOpen(false);
    setStep(1);
    setName("");
    setPhone("");
    setPin("");
  }

  if (state?.ok) {
    return (
      <section className="ui-card border border-[var(--success)]/30 bg-[var(--success)]/5 p-4">
        <p className="font-medium text-[var(--success)]">{t("emp.addSuccess")}</p>
        <button type="button" onClick={() => window.location.reload()} className="ui-btn-primary mt-3">
          OK
        </button>
      </section>
    );
  }

  if (!open) {
    return (
      <button type="button" onClick={() => setOpen(true)} className="ui-btn-primary">
        {t("emp.addEmployee")}
      </button>
    );
  }

  function goToStep2() {
    if (!name.trim() || !phone.trim() || !/^\d{4,6}$/.test(pin)) return;
    setStep(2);
  }

  return (
    <section className="ui-card p-4">
      <div className="mb-4 flex items-start justify-between gap-3">
        <div>
          <h2 className="text-sm font-semibold">{t("emp.addTitle")}</h2>
          <p className="mt-1 text-sm text-[var(--text-muted)]">{t("emp.addHint")}</p>
        </div>
        <button type="button" onClick={resetForm} className="text-sm text-[var(--muted)]">
          {t("common.cancel")}
        </button>
      </div>

      <div className="mb-4 flex gap-2">
        <span
          className={`rounded-full px-3 py-1 text-xs font-medium ${
            step === 1 ? "bg-[var(--color-primary)] text-white" : "bg-[var(--surface-muted)]"
          }`}
        >
          1. {t("emp.addStep1")}
        </span>
        <span
          className={`rounded-full px-3 py-1 text-xs font-medium ${
            step === 2 ? "bg-[var(--color-primary)] text-white" : "bg-[var(--surface-muted)]"
          }`}
        >
          2. {t("emp.addStep2")}
        </span>
      </div>

      <form action={action}>
        <input type="hidden" name="name" value={name} />
        <input type="hidden" name="phone" value={phone} />
        <input type="hidden" name="pin" value={pin} />

        {step === 1 ? (
          <div className="grid gap-4 sm:grid-cols-2">
            <FormField label={t("emp.addName")} required className="sm:col-span-2">
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                maxLength={120}
                className="ui-input"
              />
            </FormField>
            <FormField label={t("login.phone")} required>
              <input
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                type="tel"
                required
                inputMode="tel"
                autoComplete="tel"
                className="ui-input"
              />
            </FormField>
            <FormField label={t("login.pin")} hint={t("emp.pinOwnerHint")} required>
              <input
                value={pin}
                onChange={(e) => setPin(e.target.value)}
                type="password"
                required
                inputMode="numeric"
                pattern="\d{4,6}"
                maxLength={6}
                autoComplete="one-time-code"
                className="ui-input font-mono"
              />
            </FormField>
            <div className="sm:col-span-2">
              <button type="button" onClick={goToStep2} className="ui-btn-primary w-full sm:w-auto">
                {t("emp.addNext")}
              </button>
            </div>
          </div>
        ) : (
          <div>
            <p className="mb-1 text-sm">
              <span className="font-medium">{name}</span>
              <span className="text-[var(--muted)]"> · {phone}</span>
            </p>
            <p className="mb-3 text-sm font-medium">{t("emp.addAccessTitle")}</p>
            <div className="max-h-[min(24rem,50vh)] space-y-4 overflow-y-auto pr-1">
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
              <p className="mt-3 text-sm text-[var(--color-danger)]" role="alert">
                {state.error}
              </p>
            ) : null}
            <div className="mt-4 flex flex-wrap gap-3">
              <button type="button" onClick={() => setStep(1)} className="ui-btn-secondary">
                {t("emp.addBack")}
              </button>
              <PendingButton className="ui-btn-primary w-full sm:w-auto" pendingLabel={t("emp.addPending")}>
                {t("emp.addSubmit")}
              </PendingButton>
            </div>
          </div>
        )}
      </form>
    </section>
  );
}
