import { prisma } from "@core/infrastructure/prisma";
import { resolveUserPermissions } from "@core/rbac/permissions";

const userInclude = {
  role: {
    include: {
      permissions: { include: { permission: true } },
    },
  },
  permissions: { include: { permission: true } },
} as const;

/** Fresh role + permissions from DB (JWT must not freeze grants from login time). */
export async function loadLiveAuthFields(userId: string) {
  const dbUser = await prisma.user.findUnique({
    where: { id: userId },
    include: userInclude,
  });
  if (!dbUser || dbUser.archivedAt || !dbUser.isActive) {
    return {
      permissions: [] as string[],
      roleCode: "",
      roleName: "",
      name: "",
      email: "",
    };
  }
  return {
    permissions: resolveUserPermissions(dbUser),
    roleCode: dbUser.role.code,
    roleName: dbUser.role.name,
    name: dbUser.name,
    email: dbUser.email,
  };
}
