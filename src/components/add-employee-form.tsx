"use client";

import { useActionState, useMemo, useState } from "react";
import { createEmployee } from "@/app/actions/employees";
import { FormField } from "@/components/form-field";
import { PendingButton } from "@/components/pending-button";
import { createT, type Locale } from "@core/shared/i18n/i18n";
import {
  EMPLOYEE_ASSIGNABLE,
  ROLE_PERMISSIONS,
  type PermissionCode,
} from "@core/rbac/permissions";

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

type RolePreset = "sales_manager" | "worker" | "custom";

function presetCodes(role: Exclude<RolePreset, "custom">): PermissionCode[] {
  const allowed = new Set<string>(EMPLOYEE_ASSIGNABLE);
  return (ROLE_PERMISSIONS[role] ?? []).filter((c): c is PermissionCode => allowed.has(c));
}

export function AddEmployeeForm({ locale, permissions, modules }: Props) {
  const t = createT(locale);
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState<1 | 2>(1);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [rolePreset, setRolePreset] = useState<RolePreset | null>(null);
  const [selected, setSelected] = useState<Set<string>>(() => new Set());
  const [showDetails, setShowDetails] = useState(false);
  const [state, action] = useActionState(createEmployee, undefined);

  const selectedCount = selected.size;

  const summaryByModule = useMemo(() => {
    const codes = [...selected];
    return modules
      .map((moduleName) => {
        const items = permissions.filter((p) => p.module === moduleName && codes.includes(p.code));
        return { moduleName, items };
      })
      .filter((g) => g.items.length > 0);
  }, [modules, permissions, selected]);

  function resetForm() {
    setOpen(false);
    setStep(1);
    setName("");
    setPhone("");
    setPassword("");
    setRolePreset(null);
    setSelected(new Set());
    setShowDetails(false);
  }

  function applyPreset(preset: RolePreset) {
    setRolePreset(preset);
    if (preset === "custom") {
      setSelected(new Set());
      setShowDetails(true);
      return;
    }
    setSelected(new Set(presetCodes(preset)));
    setShowDetails(false);
  }

  function toggleCode(code: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(code)) next.delete(code);
      else next.add(code);
      return next;
    });
    setRolePreset((prev) => (prev && prev !== "custom" ? "custom" : prev));
  }

  function goToStep2() {
    if (!name.trim() || !phone.trim() || !password.trim()) return;
    setStep(2);
  }

  if (state?.ok) {
    return (
      <section className="ui-card border border-[var(--success)]/30 bg-[var(--success)]/5 p-4">
        <p className="font-medium text-[var(--success)]">{t("emp.addSuccess")}</p>
        <button type="button" onClick={() => window.location.reload()} className="ui-btn-primary mt-3 min-h-[44px]">
          OK
        </button>
      </section>
    );
  }

  if (!open) {
    return (
      <button type="button" onClick={() => setOpen(true)} className="ui-btn-primary min-h-[44px]">
        {t("emp.addEmployee")}
      </button>
    );
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
        <input type="hidden" name="password" value={password} />
        {[...selected].map((code) => (
          <input key={code} type="hidden" name="permissionCode" value={code} />
        ))}

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
            <FormField label={t("login.password")} hint={t("emp.pinOwnerHint")} required>
              <input
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                type="password"
                required
                autoComplete="new-password"
                className="ui-input"
              />
            </FormField>
            <div className="sm:col-span-2">
              <button type="button" onClick={goToStep2} className="ui-btn-primary min-h-[44px] w-full sm:w-auto">
                {t("emp.addNext")}
              </button>
            </div>
          </div>
        ) : (
          <div className="grid gap-3">
            <p className="m-0 text-sm">
              <span className="font-medium">{name}</span>
              <span className="text-[var(--muted)]"> · {phone}</span>
            </p>

            <p className="m-0 text-sm font-medium">{t("emp.addRoleTitle")}</p>
            <div className="grid gap-2 sm:grid-cols-2">
              <button
                type="button"
                onClick={() => applyPreset("sales_manager")}
                className={`rounded-xl border p-3 text-left transition ${
                  rolePreset === "sales_manager"
                    ? "border-[#c4a574] bg-[#fffaf2]"
                    : "border-[var(--border)] bg-[var(--surface)]"
                }`}
              >
                <span className="block text-sm font-semibold">{t("role.sales_manager")}</span>
                <span className="mt-1 block text-xs leading-snug text-[var(--muted)]">
                  {t("emp.addRoleSalesHint")}
                </span>
              </button>
              <button
                type="button"
                onClick={() => applyPreset("worker")}
                className={`rounded-xl border p-3 text-left transition ${
                  rolePreset === "worker"
                    ? "border-[#c4a574] bg-[#fffaf2]"
                    : "border-[var(--border)] bg-[var(--surface)]"
                }`}
              >
                <span className="block text-sm font-semibold">{t("emp.addRoleWorker")}</span>
                <span className="mt-1 block text-xs leading-snug text-[var(--muted)]">
                  {t("emp.addRoleWorkerHint")}
                </span>
              </button>
            </div>

            <button
              type="button"
              onClick={() => applyPreset("custom")}
              className={`rounded-xl border px-3 py-2.5 text-left text-sm ${
                rolePreset === "custom"
                  ? "border-[var(--line-strong)] bg-[var(--surface-2)] font-medium"
                  : "border-dashed border-[var(--border)] text-[var(--muted)]"
              }`}
            >
              {t("emp.addRoleCustom")}
            </button>

            {rolePreset && selectedCount > 0 && !showDetails ? (
              <div className="rounded-xl border border-[var(--border)] bg-[var(--surface-2)] p-3">
                <p className="m-0 text-xs font-semibold uppercase tracking-wide text-[var(--muted)]">
                  {t("emp.addAccessReady", { n: String(selectedCount) })}
                </p>
                <ul className="mt-2 m-0 list-none space-y-1 p-0">
                  {summaryByModule.slice(0, 4).map((g) => (
                    <li key={g.moduleName} className="text-xs text-[var(--ink-2)]">
                      <span className="font-medium text-[var(--ink)]">{t(`mod.${g.moduleName}`)}</span>
                      {" · "}
                      {g.items.length}
                    </li>
                  ))}
                </ul>
                <button
                  type="button"
                  className="mt-2 text-xs font-semibold text-[#9a7338] underline-offset-2 hover:underline"
                  onClick={() => setShowDetails(true)}
                >
                  {t("emp.addAccessEdit")}
                </button>
              </div>
            ) : null}

            {rolePreset && (showDetails || rolePreset === "custom") ? (
              <div>
                <div className="mb-2 flex items-center justify-between gap-2">
                  <p className="m-0 text-sm font-medium">{t("emp.addAccessTitle")}</p>
                  {rolePreset !== "custom" ? (
                    <button
                      type="button"
                      className="text-xs text-[var(--muted)]"
                      onClick={() => setShowDetails(false)}
                    >
                      {t("home.hide")}
                    </button>
                  ) : null}
                </div>
                <div className="max-h-[min(20rem,42vh)] space-y-3 overflow-y-auto pr-1">
                  {modules.map((moduleName) => {
                    const items = permissions.filter((p) => p.module === moduleName);
                    if (items.length === 0) return null;
                    return (
                      <div key={moduleName}>
                        <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-wide text-[var(--muted)]">
                          {t(`mod.${moduleName}`)}
                        </p>
                        <div className="grid gap-1.5 sm:grid-cols-2">
                          {items.map((perm) => (
                            <label
                              key={perm.id}
                              className="flex min-h-10 items-start gap-2 rounded-lg border border-[var(--border)] px-2.5 py-2 text-sm"
                            >
                              <input
                                type="checkbox"
                                checked={selected.has(perm.code)}
                                onChange={() => toggleCode(perm.code)}
                                className="mt-0.5"
                              />
                              <span className="leading-snug">{t(`perm.${perm.code}`)}</span>
                            </label>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ) : null}

            {!rolePreset ? (
              <p className="m-0 text-sm text-[var(--muted)]">{t("emp.addRolePickHint")}</p>
            ) : null}

            {state?.error ? (
              <p className="text-sm text-[var(--color-danger)]" role="alert">
                {state.error}
              </p>
            ) : null}

            <div className="flex flex-wrap gap-3">
              <button type="button" onClick={() => setStep(1)} className="ui-btn-secondary">
                {t("emp.addBack")}
              </button>
              <PendingButton
                className="ui-btn-primary min-h-[44px] w-full sm:w-auto"
                pendingLabel={t("emp.addPending")}
                disabled={!rolePreset || selectedCount === 0}
              >
                {t("emp.addSubmit")}
              </PendingButton>
            </div>
          </div>
        )}
      </form>
    </section>
  );
}
