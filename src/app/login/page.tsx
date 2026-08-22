import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { OwnerLoginForm } from "./login-form";
import { LoginScreen } from "./login-screen";
import { getLocale } from "@core/shared/i18n/locale";
import { WorkshopMark } from "@/components/workshop-mark";
import { LanguageSwitcher } from "@/components/language-switcher";
import styles from "./login-page.module.css";

export const dynamic = "force-dynamic";

export default async function LoginPage() {
  const session = await auth();
  if (session?.user?.id) redirect("/");

  const locale = await getLocale();

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
      </div>
    </LoginScreen>
  );
}
