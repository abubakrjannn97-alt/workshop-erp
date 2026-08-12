"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/authz";
import { writeAudit } from "@/lib/audit";

const schema = z.object({
  name: z.string().trim().min(1).max(200),
  phone: z.string().trim().max(40).optional().or(z.literal("")),
  whatsapp: z.string().trim().max(40).optional().or(z.literal("")),
  address: z.string().trim().max(400).optional().or(z.literal("")),
  source: z.string().trim().max(80).optional().or(z.literal("")),
  comment: z.string().trim().max(2000).optional().or(z.literal("")),
  managerId: z.string().optional().or(z.literal("")),
});

export async function createCustomer(formData: FormData) {
  const session = await requirePermission("crm.manage");
  const parsed = schema.safeParse({
    name: formData.get("name"),
    phone: formData.get("phone") ?? "",
    whatsapp: formData.get("whatsapp") ?? "",
    address: formData.get("address") ?? "",
    source: formData.get("source") ?? "",
    comment: formData.get("comment") ?? "",
    managerId: formData.get("managerId") ?? "",
  });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Проверьте поля." };

  const managerId =
    parsed.data.managerId ||
    (session.user.roleCode === "sales_manager" ? session.user.id : null);

  const customer = await prisma.customer.create({
    data: {
      name: parsed.data.name,
      phone: parsed.data.phone || null,
      whatsapp: parsed.data.whatsapp || null,
      address: parsed.data.address || null,
      source: parsed.data.source || null,
      comment: parsed.data.comment || null,
      managerId,
    },
  });
  await writeAudit({
    userId: session.user.id,
    action: "customer.create",
    entityType: "customer",
    entityId: customer.id,
    newValue: { name: customer.name },
  });
  revalidatePath("/crm");
  return { ok: true, id: customer.id };
}

export async function updateCustomer(formData: FormData) {
  const session = await requirePermission("crm.manage");
  const id = String(formData.get("id") ?? "");
  const parsed = schema.safeParse({
    name: formData.get("name"),
    phone: formData.get("phone") ?? "",
    whatsapp: formData.get("whatsapp") ?? "",
    address: formData.get("address") ?? "",
    source: formData.get("source") ?? "",
    comment: formData.get("comment") ?? "",
    managerId: formData.get("managerId") ?? "",
  });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Проверьте поля." };
  const existing = await prisma.customer.findUnique({ where: { id } });
  if (!existing || existing.archivedAt) return { error: "Клиент не найден." };

  await prisma.customer.update({
    where: { id },
    data: {
      name: parsed.data.name,
      phone: parsed.data.phone || null,
      whatsapp: parsed.data.whatsapp || null,
      address: parsed.data.address || null,
      source: parsed.data.source || null,
      comment: parsed.data.comment || null,
      managerId: parsed.data.managerId || existing.managerId,
    },
  });
  await writeAudit({
    userId: session.user.id,
    action: "customer.update",
    entityType: "customer",
    entityId: id,
  });
  revalidatePath("/crm");
  revalidatePath(`/crm/customers/${id}`);
  return { ok: true };
}

export async function archiveCustomer(formData: FormData) {
  const session = await requirePermission("crm.manage");
  const id = String(formData.get("id") ?? "");
  await prisma.customer.update({
    where: { id },
    data: { isActive: false, archivedAt: new Date() },
  });
  await writeAudit({
    userId: session.user.id,
    action: "customer.archive",
    entityType: "customer",
    entityId: id,
  });
  revalidatePath("/crm");
  return { ok: true };
}
