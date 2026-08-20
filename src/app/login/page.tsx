import { OwnerLoginForm } from "./login-form";
import { LoginScreen } from "./login-screen";
import { DevRolePicker } from "./dev-role-picker";
import { getDemoUsersForLogin } from "@core/auth/demo-users";
import { getLocale } from "@core/shared/i18n/locale";
import { WorkshopMark } from "@/components/workshop-mark";
import { LanguageSwitcher } from "@/components/language-switcher";
import styles from "./login-page.module.css";

export const dynamic = "force-dynamic";

export default async function LoginPage() {
  const locale = await getLocale();
  const demoUsers = getDemoUsersForLogin();

  return (
    <LoginScreen>
      <div className={styles.lang}>
        <LanguageSwitcher locale={locale} size="sm" />
      </div>
      <div className={styles.column}>
        <div className={styles.brand}>
          <WorkshopMark size={40} className="rounded-[22%]" />
        </div>
        <OwnerLoginForm locale={locale} />
        <DevRolePicker locale={locale} users={demoUsers} />
      </div>
    </LoginScreen>
  );
}
