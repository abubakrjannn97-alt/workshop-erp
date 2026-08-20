"use client";

import { useState } from "react";
import { ChevronDown, ChevronRight } from "lucide-react";
import { archiveUser, createUser, updateUser } from "@/app/actions/users";
import { FormField } from "@/components/form-field";
import { AppSelect } from "@/components/app-select";
import { ICON_STROKE } from "@/components/nav-icons";
import { createT, type Locale } from "@core/shared/i18n/i18n";
import styles from "./access-users-panel.module.css";

type RoleOption = { id: string; label: string };

type AccessUser = {
  id: string;
  name: string;
  phone: string | null;
  roleId: string;
  isActive: boolean;
  roleLabel: string;
};

type Props = {
  locale: Locale;
  canCreate: boolean;
  canEdit: boolean;
  canArchive: boolean;
  currentUserId: string;
  roles: RoleOption[];
  users: AccessUser[];
};

export function AccessUsersPanel({
  locale,
  canCreate,
  canEdit,
  canArchive,
  currentUserId,
  roles,
  users,
}: Props) {
  const t = createT(locale);
  const [createOpen, setCreateOpen] = useState(false);
  const [openUserId, setOpenUserId] = useState<string | null>(null);

  return (
    <>
      {canCreate ? (
        createOpen ? (
          <section className={styles.createPanel}>
            <div className={styles.createHead}>
              <h2 className={styles.createTitle}>{t("set.createUser")}</h2>
              <button
                type="button"
                onClick={() => setCreateOpen(false)}
                className="text-sm font-medium text-[var(--ink-3)]"
              >
                {t("common.cancel")}
              </button>
            </div>
            <div className={styles.createBody}>
              <form action={createUser} className="grid gap-3 sm:grid-cols-2">
                <FormField label={t("set.userName")}>
                  <input name="name" required placeholder={t("set.userName")} className="ui-input" />
                </FormField>
                <FormField label={t("set.userPhone")}>
                  <input name="phone" type="tel" required placeholder="+992 …" className="ui-input" />
                </FormField>
                <FormField label={t("set.userRole")}>
                  <AppSelect
                    name="roleId"
                    defaultValue={roles[0]?.id ?? ""}
                    options={roles.map((role) => ({ value: role.id, label: role.label }))}
                  />
                </FormField>
                <FormField label={t("set.userPassword")}>
                  <input name="password" type="password" required minLength={6} className="ui-input" />
                </FormField>
                <button type="submit" className={`${styles.softBtn} sm:col-span-2 w-full`}>
                  {t("set.createUser")}
                </button>
              </form>
            </div>
          </section>
        ) : (
          <button type="button" onClick={() => setCreateOpen(true)} className={styles.softBtn}>
            {t("set.createUser")}
          </button>
        )
      ) : null}

      <div className={styles.usersBanner}>
        <h2 className={styles.usersBannerTitle}>{t("set.users")}</h2>
      </div>

      {users.length === 0 ? (
        <p className="text-sm text-[var(--ink-3)]">{t("common.empty")}</p>
      ) : (
        users.map((user) => {
          const open = openUserId === user.id;
          return (
            <section key={user.id} className={styles.userCard}>
              <button
                type="button"
                className={styles.userCardHead}
                onClick={() => setOpenUserId(open ? null : user.id)}
                aria-expanded={open}
              >
                <div className="min-w-0">
                  <h2 className={styles.userCardTitle}>{user.name}</h2>
                  <p className={styles.userCardMeta}>{user.roleLabel}</p>
                </div>
                {open ? (
                  <ChevronDown size={18} strokeWidth={ICON_STROKE} className="shrink-0 text-[var(--ink-3)]" />
                ) : (
                  <ChevronRight size={18} strokeWidth={ICON_STROKE} className="shrink-0 text-[var(--ink-3)]" />
                )}
              </button>
              {open ? (
                <div className={styles.userCardBody}>
                  <form action={updateUser} className="grid gap-3 pt-4 sm:grid-cols-2">
                    <input type="hidden" name="id" value={user.id} />
                    <FormField label={t("set.userName")}>
                      <input name="name" defaultValue={user.name} disabled={!canEdit} className="ui-input" />
                    </FormField>
                    <FormField label={t("set.userPhone")}>
                      <input
                        name="phone"
                        type="tel"
                        defaultValue={user.phone ?? ""}
                        required
                        disabled={!canEdit}
                        className="ui-input"
                      />
                    </FormField>
                    <FormField label={t("set.userRole")}>
                      <AppSelect
                        name="roleId"
                        defaultValue={user.roleId}
                        disabled={!canEdit}
                        options={roles.map((role) => ({ value: role.id, label: role.label }))}
                      />
                    </FormField>
                    <FormField label={t("set.active")} className="pb-2">
                      <input type="checkbox" name="isActive" defaultChecked={user.isActive} disabled={!canEdit} />
                    </FormField>
                    {canEdit ? (
                      <FormField label={t("set.newPassword")} hint={t("set.newPasswordHint")} className="sm:col-span-2">
                        <input name="password" type="password" minLength={6} className="ui-input" />
                      </FormField>
                    ) : null}
                    <div className="sm:col-span-2 flex flex-wrap gap-3">
                      {canEdit ? (
                        <button type="submit" className={styles.softBtn}>
                          {t("common.save")}
                        </button>
                      ) : null}
                      {canArchive && user.id !== currentUserId ? (
                        <button formAction={archiveUser} type="submit" className="ui-btn-danger min-h-[44px]">
                          {t("common.archive")}
                        </button>
                      ) : null}
                    </div>
                  </form>
                </div>
              ) : null}
            </section>
          );
        })
      )}
    </>
  );
}
