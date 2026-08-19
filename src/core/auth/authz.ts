import { redirect } from "next/navigation";
import { auth } from "@/auth";
import type { PermissionCode } from "@core/rbac/permissions";
import { usesWorkerMobileExperience } from "@core/rbac/permissions";
export { hasPermission, canSeeMaterialCost } from "@core/rbac/permissions";

export async function requireSession() {
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/login");
  }
  return session as NonNullable<typeof session>;
}

export async function requirePermission(code: PermissionCode) {
  const session = await requireSession();
  const permissions = session.user.permissions ?? [];
  if (session.user.roleCode !== "owner" && !permissions.includes(code)) {
    if (usesWorkerMobileExperience(session.user.roleCode, permissions)) {
      redirect("/me/profile");
    }
    redirect("/");
  }
  return session;
}
