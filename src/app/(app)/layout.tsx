import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { AppShell } from "@/components/app-shell";
import { CashShiftControl } from "@/components/cash-shift-control";
import { hasPermission } from "@/lib/permissions";
import { getCashShiftBarData } from "@/lib/cash-shift-data";
import { getTranslator } from "@/lib/locale";
import { getShellData } from "@/lib/shell-data";

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

  const permissions = session.user.permissions as string[];
  const canFinance = hasPermission(permissions, session.user.roleCode, "finance.view");
  const shiftData = canFinance ? await getCashShiftBarData() : null;
  const shiftWidget =
    shiftData && shiftData.accounts.length > 0 ? (
      <CashShiftControl data={shiftData} locale={locale} />
    ) : null;
  const mobileShiftWidget =
    shiftData && shiftData.accounts.length > 0 ? (
      <CashShiftControl data={shiftData} locale={locale} variant="dark" />
    ) : null;

  return (
    <AppShell
      companyName={shell.companyName}
      userName={session.user.name ?? session.user.email ?? t("common.user")}
      roleName={session.user.roleName}
      roleCode={session.user.roleCode}
      permissions={permissions}
      unread={shell.unread}
      locale={locale}
      shiftBar={shiftWidget}
      mobileShiftBar={mobileShiftWidget}
    >
      {children}
    </AppShell>
  );
}
