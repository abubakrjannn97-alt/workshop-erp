import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { AppShell } from "@/components/app-shell";
import { getTranslator } from "@core/shared/i18n/locale";
import { getShellData } from "@core/infrastructure/shell-data";

export const dynamic = "force-dynamic";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  if (!session?.user) {
    redirect("/login");
  }

  const [{ t, locale }, shell] = await Promise.all([
    getTranslator(),
    getShellData(session.user.id),
  ]);

  return (
    <AppShell
      companyName={shell.companyName}
      userName={session.user.name ?? session.user.email ?? t("common.user")}
      roleName={session.user.roleName}
      roleCode={session.user.roleCode}
      permissions={session.user.permissions as string[]}
      unread={shell.unread}
      locale={locale}
    >
      {children}
    </AppShell>
  );
}
