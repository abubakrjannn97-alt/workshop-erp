"use server";

import { revalidatePath } from "next/cache";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { prisma } from "@core/infrastructure/prisma";
import { requireSession } from "@core/auth/authz";
import { writeAudit } from "@core/control/audit";
import { EMPLOYEE_ASSIGNABLE, type PermissionCode } from "@core/rbac/permissions";
import { isValidPhone, normalizePhone, staffEmailFromPhone } from "@core/shared/phone";

function requireOwner() {
  return requireSession().then((session) => {
    if (session.user.roleCode !== "owner") {
      throw new Error("ONLY_OWNER");
    }
    return session;
  });
}

const pinSchema = z
  .string()
  .trim()
  .regex(/^\d{4,6}$/, "Код должен содержать 4–6 цифр.");

const createSchema = z.object({
  name: z.string().trim().min(1).max(120),
  phone: z.string().trim().min(1),
  pin: pinSchema,
  permissionCodes: z.array(z.string()).default([]),
});

function parsePermissionCodes(formData: FormData): PermissionCode[] {
  const raw = formData.getAll("permissionCode").map(String);
  const allowed = new Set<string>(EMPLOYEE_ASSIGNABLE);
  return raw.filter((c): c is PermissionCode => allowed.has(c));
}

export async function createEmployee(
  _prev: { error?: string; ok?: boolean } | undefined,
  formData: FormData,
) {
  try {
    const session = await requireOwner();
    const phoneRaw = String(formData.get("phone") ?? "");
    if (!isValidPhone(phoneRaw)) {
      return { error: "Укажите корректный номер телефона." };
    }
    const phone = normalizePhone(phoneRaw);

    const parsed = createSchema.safeParse({
      name: formData.get("name"),
      phone: phoneRaw,
      pin: formData.get("pin"),
      permissionCodes: parsePermissionCodes(formData),
    });

    if (!parsed.success) {
      return { error: parsed.error.issues[0]?.message ?? "Проверьте поля." };
    }

    if (parsed.data.permissionCodes.length === 0) {
      return { error: "Выберите хотя бы одно право доступа." };
    }

    let role = await prisma.role.findUnique({ where: { code: "employee" } });
    if (!role) {
      role = await prisma.role.create({
        data: {
          code: "employee",
          name: "Employee",
          description: "Сотрудник с индивидуальными правами",
          isSystem: true,
        },
      });
    }

    const phoneTaken = await prisma.user.findFirst({
      where: { phone, archivedAt: null },
    });
    if (phoneTaken) {
      return { error: "Сотрудник с таким номером уже есть." };
    }

    const email = staffEmailFromPhone(phone);
    const emailTaken = await prisma.user.findUnique({ where: { email } });
    if (emailTaken) {
      return { error: "Этот номер уже используется." };
    }

    const permissions = await prisma.permission.findMany({
      where: { code: { in: parsed.data.permissionCodes } },
    });

    const passwordHash = await bcrypt.hash(parsed.data.pin, 12);
    const user = await prisma.user.create({
      data: {
        name: parsed.data.name,
        email,
        phone,
        passwordHash,
        roleId: role.id,
        hiredAt: new Date(),
        permissions: {
          create: permissions.map((p) => ({ permissionId: p.id })),
        },
      },
    });

    await writeAudit({
      userId: session.user.id,
      action: "employee.create",
      entityType: "user",
      entityId: user.id,
      newValue: {
        name: user.name,
        phone,
        permissions: parsed.data.permissionCodes,
      },
    });

    revalidatePath("/employees");
    revalidatePath("/settings/users");
    return { ok: true };
  } catch (e) {
    if (e instanceof Error && e.message === "ONLY_OWNER") {
      return { error: "Только владелец может добавлять сотрудников." };
    }
    throw e;
  }
}

export async function updateEmployeeAccess(
  _prev: { error?: string; ok?: boolean } | undefined,
  formData: FormData,
) {
  try {
    const session = await requireOwner();
    const id = String(formData.get("id") ?? "");
    const pinRaw = String(formData.get("pin") ?? "").trim();
    const permissionCodes = parsePermissionCodes(formData);

    if (!id) return { error: "Нет идентификатора." };
    if (permissionCodes.length === 0) {
      return { error: "Выберите хотя бы одно право доступа." };
    }

    const user = await prisma.user.findUnique({
      where: { id },
      include: { role: true },
    });
    if (!user || user.archivedAt || user.role.code !== "employee") {
      return { error: "Сотрудник не найден." };
    }

    const permissions = await prisma.permission.findMany({
      where: { code: { in: permissionCodes } },
    });

    const data: { passwordHash?: string } = {};
    if (pinRaw) {
      const pinCheck = pinSchema.safeParse(pinRaw);
      if (!pinCheck.success) {
        return { error: pinCheck.error.issues[0]?.message ?? "Неверный код." };
      }
      data.passwordHash = await bcrypt.hash(pinRaw, 12);
    }

    await prisma.$transaction(async (tx) => {
      await tx.userPermission.deleteMany({ where: { userId: id } });
      await tx.user.update({
        where: { id },
        data: {
          ...data,
          permissions: {
            create: permissions.map((p) => ({ permissionId: p.id })),
          },
        },
      });
    });

    await writeAudit({
      userId: session.user.id,
      action: "employee.update_access",
      entityType: "user",
      entityId: id,
      newValue: {
        permissions: permissionCodes,
        pinChanged: Boolean(data.passwordHash),
      },
    });

    revalidatePath("/employees");
    revalidatePath(`/employees/${id}`);
    return { ok: true };
  } catch (e) {
    if (e instanceof Error && e.message === "ONLY_OWNER") {
      return { error: "Только владелец может менять доступ." };
    }
    throw e;
  }
}

export async function archiveEmployee(formData: FormData) {
  try {
    const session = await requireOwner();
    const id = String(formData.get("id") ?? "");
    if (!id) return { error: "Нет идентификатора." };

    const user = await prisma.user.findUnique({
      where: { id },
      include: { role: true },
    });
    if (!user || user.role.code !== "employee") {
      return { error: "Сотрудник не найден." };
    }

    await prisma.user.update({
      where: { id },
      data: { isActive: false, archivedAt: new Date() },
    });

    await writeAudit({
      userId: session.user.id,
      action: "employee.archive",
      entityType: "user",
      entityId: id,
      newValue: { archived: true },
    });

    revalidatePath("/employees");
    return { ok: true };
  } catch (e) {
    if (e instanceof Error && e.message === "ONLY_OWNER") {
      return { error: "Только владелец может удалять сотрудников." };
    }
    throw e;
  }
}
