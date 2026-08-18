import { OwnerLoginForm } from "./login-form";
import { DevRolePicker } from "./dev-role-picker";
import { getDemoUsersForLogin } from "@core/auth/demo-users";
import { getLocale } from "@core/shared/i18n/locale";
import { WorkshopMark } from "@/components/workshop-mark";
import { LanguageSwitcher } from "@/components/language-switcher";

export const dynamic = "force-dynamic";

export default async function LoginPage() {
  const locale = await getLocale();
  const demoUsers = getDemoUsersForLogin();

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-[#0B0E1A] px-4">
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "linear-gradient(180deg, #0B0E1A 0%, #16130F 28%, #F3F4F7 62%, #FFFFFF 100%)",
        }}
      />
      <div className="absolute right-4 top-4 z-20" style={{ paddingTop: "env(safe-area-inset-top)" }}>
        <LanguageSwitcher locale={locale} variant="dark" />
      </div>
      <div className="relative w-full max-w-sm">
        <div className="mb-6 flex flex-col items-center gap-2 text-center">
          <WorkshopMark size={72} className="rounded-[22%]" />
          <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[var(--color-gold)]">
            Produsion System
          </p>
        </div>
        <OwnerLoginForm locale={locale} />
        <DevRolePicker locale={locale} users={demoUsers} />
      </div>
    </div>
  );
}
