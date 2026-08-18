import { hasPermission, usesWorkerMobileExperience, type PermissionCode } from "@core/rbac/permissions";

export function isProductionScopedWorker(roleCode: string, permissions: string[]) {
  if (hasPermission(permissions, roleCode, "production.manage" as PermissionCode)) return false;
  if (roleCode === "worker") return true;
  return usesWorkerMobileExperience(roleCode, permissions);
}

export function assertCanCloseBatch(params: {
  roleCode: string;
  userId: string;
  permissions: string[];
  responsibleUserId: string | null;
}): { ok: true } | { ok: false; error: string } {
  if (params.roleCode === "owner") return { ok: true };
  if (hasPermission(params.permissions, params.roleCode, "production.manage")) return { ok: true };
  if (params.responsibleUserId && params.responsibleUserId === params.userId) return { ok: true };
  return { ok: false, error: "Можно закрывать только свои назначенные партии." };
}
