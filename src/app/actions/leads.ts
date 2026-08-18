"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/authz";
import { writeAudit } from "@core/control/audit";
import { LOST_REASONS } from "@/lib/orders";

export async function createLead(formData: FormData) {
  const session = await requirePermission("crm.manage");
  const parsed = z
    .object({
      name: z.string().trim().min(1).max(200),
      phone: z.string().trim().max(40).optional().or(z.literal("")),
      customerId: z.string().optional().or(z.literal("")),
      comment: z.string().trim().max(2000).optional().or(z.literal("")),
    })
    .safeParse({
      name: formData.get("name"),
      phone: formData.get("phone") ?? "",
      customerId: formData.get("customerId") ?? "",
      comment: formData.get("comment") ?? "",
    });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Проверьте поля." };

  const stage = await prisma.leadStage.findUnique({ where: { code: "NEW" } });
  if (!stage) return { error: "Стадии воронки не настроены." };

  const lead = await prisma.lead.create({
    data: {
      name: parsed.data.name,
      phone: parsed.data.phone || null,
      customerId: parsed.data.customerId || null,
      comment: parsed.data.comment || null,
      stageId: stage.id,
      managerId: session.user.id,
    },
  });
  await writeAudit({
    userId: session.user.id,
    action: "lead.create",
    entityType: "lead",
    entityId: lead.id,
    newValue: { name: lead.name },
  });
  revalidatePath("/crm");
  revalidatePath("/sales");
  return { ok: true, id: lead.id };
}

export async function moveLead(formData: FormData) {
  const session = await requirePermission("crm.manage");
  const id = String(formData.get("id") ?? "");
  const stageId = String(formData.get("stageId") ?? "");
  const lostReason = String(formData.get("lostReason") ?? "");
  const stage = await prisma.leadStage.findUnique({ where: { id: stageId } });
  if (!stage) return { error: "Стадия не найдена." };
  if (stage.isLost) {
    const ok = LOST_REASONS.some((r) => r.code === lostReason);
    if (!ok) return { error: "Укажите причину проигрыша." };
  }
  await prisma.lead.update({
    where: { id },
    data: { stageId, lostReason: stage.isLost ? lostReason : null },
  });
  await writeAudit({
    userId: session.user.id,
    action: "lead.move",
    entityType: "lead",
    entityId: id,
    newValue: { stage: stage.code, lostReason: stage.isLost ? lostReason : null },
  });
  revalidatePath("/crm");
  revalidatePath("/sales");
  return { ok: true };
}
