import { prisma } from "@core/infrastructure/prisma";
import type { PermissionCode } from "@core/rbac/permissions";
import { resolveUserPermissions } from "@core/rbac/permissions";
import { isAuthBypassEnabled } from "@core/shared/env-guard";

/** Включён только при AUTH_BYPASS=1 вне production — для локального теста без формы входа. */
export function isAuthBypass() {
  return isAuthBypassEnabled();
}

export async function bypassOwnerSession() {
  if (!isAuthBypassEnabled()) {
    return null;
  }

  const email = (process.env.OWNER_EMAIL ?? "owner@workshop.local").trim().toLowerCase();
  const user = await prisma.user.findUnique({
    where: { email },
    include: {
      role: {
        include: {
          permissions: { include: { permission: true } },
        },
      },
      permissions: { include: { permission: true } },
    },
  });
  if (!user || user.archivedAt || !user.isActive) {
    return null;
  }
  return {
    user: {
      id: user.id,
      email: user.email,
      name: user.name,
      roleCode: user.role.code,
      roleName: user.role.name,
      permissions: resolveUserPermissions(user) as PermissionCode[],
    },
    expires: new Date(Date.now() + 12 * 60 * 60 * 1000).toISOString(),
  };
}
