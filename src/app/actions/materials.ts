"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/authz";
import { writeAudit } from "@/lib/audit";
import { money, qty } from "@/lib/decimal";
import { unitCost } from "@/lib/costing";

const schema = z.object({
  name: z.string().trim().min(1).max(160),
  category: z.string().trim().min(1).max(80),
  supplierName: z.string().trim().max(160).optional().or(z.literal("")),
  storageUnitId: z.string().min(1),
  purchaseUnitId: z.string().min(1),
  packageWeight: z.string().regex(/^\d+(\.\d{1,6})?$/, "Вес упаковки"),
  packagePrice: z.string().regex(/^\d+(\.\d{1,4})?$/, "Цена упаковки"),
  minStock: z.string().regex(/^\d+(\.\d{1,6})?$/).optional().or(z.literal("")),
});

async function recordPrice(
  materialId: string,
  packageWeight: string,
  packagePrice: string,
  userId: string,
) {
  const price = unitCost(packagePrice, packageWeight);
  await prisma.materialPriceHistory.updateMany({
    where: { materialId, validTo: null },
    data: { validTo: new Date() },
  });
  await prisma.materialPriceHistory.create({
    data: {
      materialId,
      packageWeight,
      packagePrice,
      unitPrice: price ? money(price) : "0",
      createdById: userId,
    },
  });
}

export async function createMaterial(formData: FormData) {
  const session = await requirePermission("materials.manage");
  const parsed = schema.safeParse({
    name: formData.get("name"),
    category: formData.get("category"),
    supplierName: formData.get("supplierName") ?? "",
    storageUnitId: formData.get("storageUnitId"),
    purchaseUnitId: formData.get("purchaseUnitId"),
    packageWeight: formData.get("packageWeight"),
    packagePrice: formData.get("packagePrice"),
    minStock: formData.get("minStock") ?? "0",
  });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Проверьте поля." };

  const price = unitCost(parsed.data.packagePrice, parsed.data.packageWeight);
  const material = await prisma.material.create({
    data: {
      name: parsed.data.name,
      category: parsed.data.category,
      supplierName: parsed.data.supplierName || null,
      storageUnitId: parsed.data.storageUnitId,
      purchaseUnitId: parsed.data.purchaseUnitId,
      packageWeight: parsed.data.packageWeight,
      packagePrice: parsed.data.packagePrice,
      minStock: parsed.data.minStock || "0",
      lastPurchasePrice: price ? money(price) : null,
      averagePurchasePrice: price ? money(price) : null,
    },
  });

  await recordPrice(material.id, parsed.data.packageWeight, parsed.data.packagePrice, session.user.id);
  await writeAudit({
    userId: session.user.id,
    action: "material.create",
    entityType: "material",
    entityId: material.id,
    newValue: { name: material.name, packagePrice: parsed.data.packagePrice },
  });
  revalidatePath("/materials");
  return { ok: true };
}

export async function updateMaterial(formData: FormData) {
  const session = await requirePermission("materials.manage");
  const id = String(formData.get("id") ?? "");
  const parsed = schema.safeParse({
    name: formData.get("name"),
    category: formData.get("category"),
    supplierName: formData.get("supplierName") ?? "",
    storageUnitId: formData.get("storageUnitId"),
    purchaseUnitId: formData.get("purchaseUnitId"),
    packageWeight: formData.get("packageWeight"),
    packagePrice: formData.get("packagePrice"),
    minStock: formData.get("minStock") ?? "0",
  });
  if (!id || !parsed.success) {
    return { error: parsed.success ? "Нет идентификатора." : parsed.error.issues[0]?.message };
  }

  const before = await prisma.material.findUnique({ where: { id } });
  if (!before || before.archivedAt) return { error: "Материал не найден." };

  const priceChanged =
    money(before.packagePrice) !== money(parsed.data.packagePrice) ||
    qty(before.packageWeight) !== qty(parsed.data.packageWeight);

  const price = unitCost(parsed.data.packagePrice, parsed.data.packageWeight);
  await prisma.material.update({
    where: { id },
    data: {
      name: parsed.data.name,
      category: parsed.data.category,
      supplierName: parsed.data.supplierName || null,
      storageUnitId: parsed.data.storageUnitId,
      purchaseUnitId: parsed.data.purchaseUnitId,
      packageWeight: parsed.data.packageWeight,
      packagePrice: parsed.data.packagePrice,
      minStock: parsed.data.minStock || "0",
      lastPurchasePrice: price ? money(price) : before.lastPurchasePrice,
    },
  });

  if (priceChanged) {
    await recordPrice(id, parsed.data.packageWeight, parsed.data.packagePrice, session.user.id);
  }

  await writeAudit({
    userId: session.user.id,
    action: "material.update",
    entityType: "material",
    entityId: id,
    oldValue: {
      name: before.name,
      packagePrice: before.packagePrice.toString(),
      packageWeight: before.packageWeight.toString(),
    },
    newValue: {
      name: parsed.data.name,
      packagePrice: parsed.data.packagePrice,
      packageWeight: parsed.data.packageWeight,
    },
  });

  revalidatePath("/materials");
  revalidatePath(`/materials/${id}`);
  revalidatePath("/products");
  return { ok: true };
}

export async function archiveMaterial(formData: FormData) {
  const session = await requirePermission("materials.manage");
  const id = String(formData.get("id") ?? "");
  const before = await prisma.material.findUnique({ where: { id } });
  if (!before) return { error: "Материал не найден." };

  await prisma.material.update({
    where: { id },
    data: { isActive: false, archivedAt: new Date() },
  });
  await writeAudit({
    userId: session.user.id,
    action: "material.archive",
    entityType: "material",
    entityId: id,
    oldValue: { name: before.name },
    newValue: { archived: true },
  });
  revalidatePath("/materials");
  return { ok: true };
}
