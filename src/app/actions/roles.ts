"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/authz";
import { writeAudit } from "@/lib/audit";

export async function updateRolePermissions(formData: FormData) {
  const session = await requirePermission("roles.manage");
  const roleId = String(formData.get("roleId") ?? "");
  const permissionIds = formData.getAll("permissionId").map(String);

  const role = await prisma.role.findUnique({
    where: { id: roleId },
    include: { permissions: true },
  });
  if (!role) return { error: "Роль не найдена." };
  if (role.code === "owner") {
    return { error: "Права Owner нельзя сузить. У этой роли полный доступ." };
  }

  const oldIds = role.permissions.map((p) => p.permissionId).sort();
  const newIds = [...permissionIds].sort();

  await prisma.$transaction([
    prisma.rolePermission.deleteMany({ where: { roleId } }),
    ...(newIds.length
      ? [
          prisma.rolePermission.createMany({
            data: newIds.map((permissionId) => ({ roleId, permissionId })),
          }),
        ]
      : []),
  ]);

  await writeAudit({
    userId: session.user.id,
    action: "role.permissions.update",
    entityType: "role",
    entityId: roleId,
    oldValue: { permissionIds: oldIds },
    newValue: { permissionIds: newIds },
  });

  revalidatePath("/settings/roles");
  return { ok: true };
}
