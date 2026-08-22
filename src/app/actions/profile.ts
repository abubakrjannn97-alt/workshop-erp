"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@core/infrastructure/prisma";
import { requireSession } from "@core/auth/authz";
import { writeAudit } from "@core/control/audit";
import { isValidPhone, normalizePhone } from "@core/shared/phone";

const schema = z.object({
  name: z.string().trim().min(1).max(120),
  phone: z.string().trim().max(40).optional().or(z.literal("")),
});

export async function updateMyProfile(formData: FormData) {
  const session = await requireSession();
  const parsed = schema.safeParse({
    name: formData.get("name"),
    phone: formData.get("phone") ?? "",
  });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Проверьте поля." };

  let phone: string | null = null;
  if (parsed.data.phone) {
    if (!isValidPhone(parsed.data.phone)) return { error: "Укажите корректный телефон." };
    phone = normalizePhone(parsed.data.phone);
    const taken = await prisma.user.findFirst({
      where: { phone, archivedAt: null, id: { not: session.user.id } },
    });
    if (taken) return { error: "Этот телефон уже занят." };
  }

  await prisma.user.update({
    where: { id: session.user.id },
    data: {
      name: parsed.data.name,
      phone,
    },
  });

  await writeAudit({
    userId: session.user.id,
    action: "user.profile.update",
    entityType: "user",
    entityId: session.user.id,
    newValue: { name: parsed.data.name, phone },
  });

  revalidatePath("/me/profile");
  return { ok: true };
}
