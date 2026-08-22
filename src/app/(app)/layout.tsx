import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { AppShell } from "@/components/app-shell";
import { getTranslator } from "@core/shared/i18n/locale";
import { getShellData } from "@core/infrastructure/shell-data";
import { bindWorkshopContext, resolveActiveWorkshopId } from "@core/workshop/workshop-context";
import { hasWorkerShell } from "@core/worker/worker-shell";

export const dynamic = "force-dynamic";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  if (!session?.user) {
    redirect("/login");
  }

  await bindWorkshopContext(session.user.id, session.user.roleCode ?? "employee");
  const workshopId = await resolveActiveWorkshopId(session.user.id, session.user.roleCode ?? "employee");

  const [{ t, locale }, shell] = await Promise.all([
    getTranslator(),
    getShellData(session.user.id, workshopId),
  ]);

  const permissions = session.user.permissions as string[];
  const workerShell = hasWorkerShell(session.user.roleCode, permissions);

  return (
    <AppShell
      companyName={shell.companyName}
      userName={session.user.name ?? session.user.email ?? t("common.user")}
      roleName={session.user.roleName}
      roleCode={session.user.roleCode}
      permissions={permissions}
      workerShell={workerShell}
      unread={shell.unread}
      locale={locale}
    >
      {children}
    </AppShell>
  );
}
