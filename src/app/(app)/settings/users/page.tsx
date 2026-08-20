import { getTranslator } from "@core/shared/i18n/locale";
import { prisma } from "@core/infrastructure/prisma";
import { requirePermission } from "@core/auth/authz";
import { archiveUser, createUser, updateUser } from "@/app/actions/users";
import { FormField } from "@/components/form-field";
import { AppSelect } from "@/components/app-select";
import { SettingsNav } from "@/components/settings-nav";
import styles from "@/styles/premium.module.css";

export default async function UsersPage() {
  const { t, n, locale } = await getTranslator();
  const session = await requirePermission("users.view");
  const canCreate = session.user.roleCode === "owner" || session.user.permissions.includes("users.create");
  const canEdit = session.user.roleCode === "owner" || session.user.permissions.includes("users.edit");
  const canArchive = session.user.roleCode === "owner" || session.user.permissions.includes("users.archive");

  const [users, roles] = await Promise.all([
    prisma.user.findMany({ where: { archivedAt: null }, include: { role: true }, orderBy: { createdAt: "asc" } }),
    prisma.role.findMany({ where: { archivedAt: null }, orderBy: { name: "asc" } }),
  ]);

  return (
    <div className={styles.page}>
      <header className={styles.header}><div className={styles.headerText}><h1 className={styles.title}>{t("set.users")}</h1><p className={styles.subtitle}>{t("set.usersHint")}</p></div></header>
      <SettingsNav current="users" locale={locale} />

      {canCreate ? (
        <section className={styles.section}>
          <div className={styles.sectionHead}><h2 className={styles.sectionTitle}>{t("set.createUser")}</h2></div>
          <div className={styles.sectionBody}>
            <form action={createUser} className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              <FormField label={t("set.userName")}><input name="name" required placeholder={t("set.userName")} className="ui-input" /></FormField>
              <FormField label={t("set.userEmail")}><input name="email" type="email" required placeholder="name@workshop.local" className="ui-input" /></FormField>
              <FormField label={t("set.userPhone")}><input name="phone" placeholder="+992 …" className="ui-input" /></FormField>
              <FormField label={t("set.userRole")}>
                <AppSelect
                  name="roleId"
                  defaultValue={roles[0]?.id ?? ""}
                  options={roles.map((role) => ({ value: role.id, label: n("role", role.code, role.name) }))}
                />
              </FormField>
              <FormField label={t("set.userPassword")} className="sm:col-span-2 lg:col-span-1"><input name="password" type="password" required minLength={8} className="ui-input" /></FormField>
              <button type="submit" className="ui-btn-primary min-h-[44px] sm:col-span-2 lg:col-span-3">{t("set.createUser")}</button>
            </form>
          </div>
        </section>
      ) : null}

      {users.map((user) => (
        <section key={user.id} className={styles.section}>
          <div className={styles.sectionHead}><h2 className={styles.sectionTitle}>{user.name}</h2></div>
          <div className={styles.sectionBody}>
            <form action={updateUser} className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              <input type="hidden" name="id" value={user.id} />
              <FormField label={t("set.userName")}><input name="name" defaultValue={user.name} disabled={!canEdit} className="ui-input" /></FormField>
              <FormField label={t("set.userEmail")}><input value={user.email} disabled title={user.email} className="ui-input min-w-0" /></FormField>
              <FormField label={t("set.userPhone")}><input name="phone" defaultValue={user.phone ?? ""} disabled={!canEdit} className="ui-input" /></FormField>
              <FormField label={t("set.userRole")}>
                <AppSelect
                  name="roleId"
                  defaultValue={user.roleId}
                  disabled={!canEdit}
                  options={roles.map((role) => ({ value: role.id, label: n("role", role.code, role.name) }))}
                />
              </FormField>
              <FormField label={t("set.active")} className="pb-2"><input type="checkbox" name="isActive" defaultChecked={user.isActive} disabled={!canEdit} /></FormField>
              {canEdit ? <FormField label={t("set.newPassword")} hint={t("set.newPasswordHint")}><input name="password" type="password" className="ui-input" /></FormField> : null}
              <div className="sm:col-span-2 lg:col-span-3 flex flex-wrap gap-3">
                {canEdit ? <button type="submit" className="ui-btn-primary min-h-[44px]">{t("common.save")}</button> : null}
                {canArchive && user.id !== session.user.id ? <button formAction={archiveUser} type="submit" className="ui-btn-danger min-h-[44px]">{t("common.archive")}</button> : null}
              </div>
            </form>
          </div>
        </section>
      ))}
    </div>
  );
}
