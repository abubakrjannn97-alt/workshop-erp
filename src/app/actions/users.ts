"use server";

import { revalidatePath } from "next/cache";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@core/auth/authz";
import { writeAudit } from "@core/control/audit";

const createSchema = z.object({
  name: z.string().trim().min(1).max(120),
  email: z.string().trim().email().toLowerCase(),
  phone: z.string().trim().max(32).optional(),
  password: z.string().min(8).max(100),
  roleId: z.string().min(1),
});

export async function createUser(formData: FormData) {
  const session = await requirePermission("users.create");
  const parsed = createSchema.safeParse({
    name: formData.get("name"),
    email: formData.get("email"),
    phone: formData.get("phone") || undefined,
    password: formData.get("password"),
    roleId: formData.get("roleId"),
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Проверьте поля." };
  }

  const exists = await prisma.user.findUnique({ where: { email: parsed.data.email } });
  if (exists) return { error: "Пользователь с таким email уже есть." };

  const passwordHash = await bcrypt.hash(parsed.data.password, 12);
  const user = await prisma.user.create({
    data: {
      name: parsed.data.name,
      email: parsed.data.email,
      phone: parsed.data.phone || null,
      passwordHash,
      roleId: parsed.data.roleId,
    },
  });

  await writeAudit({
    userId: session.user.id,
    action: "user.create",
    entityType: "user",
    entityId: user.id,
    newValue: {
      name: user.name,
      email: user.email,
      roleId: user.roleId,
    },
  });

  revalidatePath("/settings/users");
  return { ok: true };
}

export async function updateUser(formData: FormData) {
  const session = await requirePermission("users.edit");
  const id = String(formData.get("id") ?? "");
  const parsed = z
    .object({
      name: z.string().trim().min(1).max(120),
      phone: z.string().trim().max(32).optional(),
      roleId: z.string().min(1),
      isActive: z.boolean(),
      password: z.string().min(8).max(100).optional().or(z.literal("")),
    })
    .safeParse({
      name: formData.get("name"),
      phone: formData.get("phone") || undefined,
      roleId: formData.get("roleId"),
      isActive: formData.get("isActive") === "on",
      password: formData.get("password") || "",
    });

  if (!id || !parsed.success) {
    return { error: parsed.success ? "Нет идентификатора." : parsed.error.issues[0]?.message };
  }

  const before = await prisma.user.findUnique({ where: { id } });
  if (!before || before.archivedAt) return { error: "Пользователь не найден." };

  const data: {
    name: string;
    phone: string | null;
    roleId: string;
    isActive: boolean;
    passwordHash?: string;
  } = {
    name: parsed.data.name,
    phone: parsed.data.phone || null,
    roleId: parsed.data.roleId,
    isActive: parsed.data.isActive,
  };

  if (parsed.data.password) {
    data.passwordHash = await bcrypt.hash(parsed.data.password, 12);
  }

  await prisma.user.update({ where: { id }, data });

  await writeAudit({
    userId: session.user.id,
    action: "user.update",
    entityType: "user",
    entityId: id,
    oldValue: {
      name: before.name,
      roleId: before.roleId,
      isActive: before.isActive,
    },
    newValue: {
      name: data.name,
      roleId: data.roleId,
      isActive: data.isActive,
      passwordChanged: Boolean(data.passwordHash),
    },
  });

  revalidatePath("/settings/users");
  return { ok: true };
}

export async function archiveUser(formData: FormData) {
  const session = await requirePermission("users.archive");
  const id = String(formData.get("id") ?? "");
  if (id === session.user.id) return { error: "Нельзя архивировать собственную учётную запись." };

  const before = await prisma.user.findUnique({ where: { id } });
  if (!before) return { error: "Пользователь не найден." };

  await prisma.user.update({
    where: { id },
    data: { isActive: false, archivedAt: new Date() },
  });

  await writeAudit({
    userId: session.user.id,
    action: "user.archive",
    entityType: "user",
    entityId: id,
    oldValue: { email: before.email, isActive: before.isActive },
    newValue: { archived: true },
  });

  revalidatePath("/settings/users");
  return { ok: true };
}
