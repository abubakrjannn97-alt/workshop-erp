"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@core/infrastructure/prisma";
import { requirePermission } from "@core/auth/authz";
import { writeAudit } from "@core/control/audit";
import { CUSTOMER_STATUSES, type CustomerStatus } from "@core/crm/customer-status";
import { setCustomerPipelineStatus } from "@core/crm/customer-pipeline";

const schema = z.object({
  name: z.string().trim().min(1).max(200),
  phone: z.string().trim().max(40).optional().or(z.literal("")),
  whatsapp: z.string().trim().max(40).optional().or(z.literal("")),
  address: z.string().trim().max(400).optional().or(z.literal("")),
  source: z.string().trim().max(80).optional().or(z.literal("")),
  comment: z.string().trim().max(2000).optional().or(z.literal("")),
  managerId: z.string().optional().or(z.literal("")),
  pipelineStatus: z.enum(CUSTOMER_STATUSES).optional(),
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
    pipelineStatus: formData.get("pipelineStatus") ?? "NEW",
  });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Проверьте поля." };

  const managerId =
    parsed.data.managerId ||
    (session.user.roleCode === "sales_manager" ? session.user.id : null);

  const customer = await prisma.customer.create({
    data: {
      name: parsed.data.name,
      phone: parsed.data.phone || null,
      whatsapp: parsed.data.whatsapp || parsed.data.phone || null,
      address: parsed.data.address || null,
      source: parsed.data.source || null,
      comment: parsed.data.comment || null,
      managerId,
    },
  });
  await setCustomerPipelineStatus(customer.id, parsed.data.pipelineStatus ?? "NEW");
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
      whatsapp: parsed.data.phone || parsed.data.whatsapp || null,
      address: formData.has("address") ? parsed.data.address || null : existing.address,
      source: parsed.data.source || null,
      comment: formData.has("comment") ? parsed.data.comment || null : existing.comment,
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

export async function restoreCustomer(formData: FormData) {
  const session = await requirePermission("crm.manage");
  const id = String(formData.get("id") ?? "");
  await prisma.customer.update({
    where: { id },
    data: { isActive: true, archivedAt: null },
  });
  await writeAudit({
    userId: session.user.id,
    action: "customer.restore",
    entityType: "customer",
    entityId: id,
  });
  revalidatePath("/crm");
  revalidatePath(`/crm/customers/${id}`);
  return { ok: true };
}

export async function updateCustomerStatus(formData: FormData) {
  const session = await requirePermission("crm.manage");
  const id = String(formData.get("id") ?? "");
  const status = String(formData.get("status") ?? "");
  if (!(CUSTOMER_STATUSES as readonly string[]).includes(status)) {
    return { error: "Неверный статус." };
  }

  const existing = await prisma.customer.findUnique({ where: { id } });
  if (!existing || existing.archivedAt) return { error: "Клиент не найден." };

  try {
    await setCustomerPipelineStatus(id, status as CustomerStatus);
  } catch {
    return { error: "Не удалось сохранить статус. Обновите страницу и попробуйте снова." };
  }
  await writeAudit({
    userId: session.user.id,
    action: "customer.status",
    entityType: "customer",
    entityId: id,
    newValue: { pipelineStatus: status },
  });
  revalidatePath("/crm");
  revalidatePath(`/crm/customers/${id}`);
  const orders = await prisma.order.findMany({ where: { customerId: id }, select: { id: true } });
  for (const order of orders) {
    revalidatePath(`/orders/${order.id}`);
  }
  return { ok: true };
}
