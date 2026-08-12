import { prisma } from "@/lib/prisma";
import type { PermissionCode } from "@/lib/permissions";

/** Включён только при AUTH_BYPASS=1 — для локального теста без формы входа. */
export function isAuthBypass() {
  return process.env.AUTH_BYPASS === "1";
}

export async function bypassOwnerSession() {
  const email = (process.env.OWNER_EMAIL ?? "owner@workshop.local").trim().toLowerCase();
  const user = await prisma.user.findUnique({
    where: { email },
    include: {
      role: {
        include: { permissions: { include: { permission: true } } },
      },
    },
  });
  if (!user || user.archivedAt || !user.isActive) {
    throw new Error(`AUTH_BYPASS: пользователь ${email} не найден. Запустите npm run db:seed.`);
  }
  return {
    user: {
      id: user.id,
      email: user.email,
      name: user.name,
      roleCode: user.role.code,
      roleName: user.role.name,
      permissions: user.role.permissions.map((rp) => rp.permission.code) as PermissionCode[],
    },
    expires: new Date(Date.now() + 12 * 60 * 60 * 1000).toISOString(),
  };
}
