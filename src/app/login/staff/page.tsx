import { StaffLoginForm } from "../login-form";
import { getLocale } from "@core/shared/i18n/locale";
import { WorkshopMark } from "@/components/workshop-mark";
import { LanguageSwitcher } from "@/components/language-switcher";
import styles from "../login-page.module.css";

export const dynamic = "force-dynamic";

export default async function StaffLoginPage() {
  const locale = await getLocale();

  return (
    <div className={styles.screen}>
      <div className={styles.lang}>
        <LanguageSwitcher locale={locale} />
      </div>
      <div className={styles.column}>
        <div className={styles.brand}>
          <WorkshopMark size={40} className="rounded-[22%]" />
        </div>
        <StaffLoginForm locale={locale} />
      </div>
    </div>
  );
}
