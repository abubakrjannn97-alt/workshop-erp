"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@core/infrastructure/prisma";
import { requirePermission } from "@core/auth/authz";
import { writeAudit } from "@core/control/audit";

const schema = z.object({
  name: z.string().trim().min(1).max(160),
  phone: z.string().trim().max(40).optional().or(z.literal("")),
  contact: z.string().trim().max(120).optional().or(z.literal("")),
});

export async function createSupplier(formData: FormData) {
  const session = await requirePermission("suppliers.manage");
  const parsed = schema.safeParse({
    name: formData.get("name"),
    phone: formData.get("phone") ?? "",
    contact: formData.get("contact") ?? "",
  });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Проверьте поля." };

  const supplier = await prisma.supplier.create({
    data: {
      name: parsed.data.name,
      phone: parsed.data.phone || null,
      contact: parsed.data.contact || null,
    },
  });
  const materialIds = formData.getAll("materialId").map(String).filter(Boolean);
  if (materialIds.length) {
    await prisma.supplierMaterial.createMany({
      data: materialIds.map((materialId) => ({ supplierId: supplier.id, materialId })),
    });
  }
  await writeAudit({
    userId: session.user.id,
    action: "supplier.create",
    entityType: "supplier",
    entityId: supplier.id,
    newValue: { name: supplier.name },
  });
  revalidatePath("/purchasing");
  revalidatePath("/purchasing/suppliers");
  revalidatePath("/warehouse/add");
  return { ok: true, id: supplier.id };
}
