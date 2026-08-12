import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { AppShell } from "@/components/app-shell";
import { DEFAULT_SETTINGS, SETTING_KEYS } from "@/lib/settings";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  if (!session?.user) {
    redirect("/login");
  }

  const [company, unread] = await Promise.all([
    prisma.setting.findUnique({
      where: { key: SETTING_KEYS.companyName },
    }),
    prisma.notification.count({ where: { userId: session.user.id, readAt: null } }),
  ]);

  return (
    <AppShell
      companyName={
        typeof company?.value === "string" ? company.value : DEFAULT_SETTINGS.companyName
      }
      userName={session.user.name ?? session.user.email ?? "Пользователь"}
      roleName={session.user.roleName}
      roleCode={session.user.roleCode}
      permissions={session.user.permissions as string[]}
      unread={unread}
    >
      {children}
    </AppShell>
  );
}
