"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@core/infrastructure/prisma";
import { requirePermission } from "@core/auth/authz";
import { writeAudit } from "@core/control/audit";
import { money } from "@core/shared/decimal";
import { notifyRoles } from "@core/control/control";

const productSchema = z.object({
  name: z.string().trim().min(1).max(160),
  category: z.string().trim().min(1).max(80),
  photoUrl: z.string().trim().max(2000).optional().or(z.literal("")),
  saleUnitId: z.string().min(1),
  outputUnitId: z.string().min(1),
  minPrice: z.string().regex(/^\d+(\.\d{1,4})?$/, "Минимальная цена"),
  recipeBaseQty: z.string().regex(/^\d+(\.\d{1,6})?$/),
  outputPerBase: z.string().regex(/^\d+(\.\d{1,6})?$/),
  price: z.string().regex(/^\d+(\.\d{1,4})?$/, "Цена продажи"),
});

async function setPrice(productId: string, price: string, userId: string) {
  await prisma.productPrice.updateMany({
    where: { productId, validTo: null },
    data: { validTo: new Date() },
  });
  await prisma.productPrice.create({
    data: { productId, price, createdById: userId },
  });
}

export async function createProduct(formData: FormData) {
  const session = await requirePermission("products.manage");
  const parsed = productSchema.safeParse({
    name: formData.get("name"),
    category: formData.get("category"),
    photoUrl: formData.get("photoUrl") ?? "",
    saleUnitId: formData.get("saleUnitId"),
    outputUnitId: formData.get("outputUnitId"),
    minPrice: formData.get("minPrice") || "0",
    recipeBaseQty: formData.get("recipeBaseQty") || "1",
    outputPerBase: formData.get("outputPerBase") || "1",
    price: formData.get("price") || "0",
  });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Проверьте поля." };

  const product = await prisma.product.create({
    data: {
      name: parsed.data.name,
      category: parsed.data.category,
      photoUrl: parsed.data.photoUrl || null,
      saleUnitId: parsed.data.saleUnitId,
      outputUnitId: parsed.data.outputUnitId,
      minPrice: parsed.data.minPrice,
      recipeBaseQty: parsed.data.recipeBaseQty,
      outputPerBase: parsed.data.outputPerBase,
      recipe: { create: {} },
    },
  });

  await setPrice(product.id, parsed.data.price, session.user.id);
  await writeAudit({
    userId: session.user.id,
    action: "product.create",
    entityType: "product",
    entityId: product.id,
    newValue: { name: product.name, price: parsed.data.price },
  });
  revalidatePath("/products");
  return { ok: true, id: product.id };
}

export async function updateProduct(formData: FormData) {
  const session = await requirePermission("products.manage");
  const id = String(formData.get("id") ?? "");
  const parsed = productSchema.safeParse({
    name: formData.get("name"),
    category: formData.get("category"),
    photoUrl: formData.get("photoUrl") ?? "",
    saleUnitId: formData.get("saleUnitId"),
    outputUnitId: formData.get("outputUnitId"),
    minPrice: formData.get("minPrice") || "0",
    recipeBaseQty: formData.get("recipeBaseQty") || "1",
    outputPerBase: formData.get("outputPerBase") || "1",
    price: formData.get("price") || "0",
  });
  if (!id || !parsed.success) {
    return { error: parsed.success ? "Нет идентификатора." : parsed.error.issues[0]?.message };
  }

  const before = await prisma.product.findUnique({
    where: { id },
    include: { prices: { where: { validTo: null }, take: 1 } },
  });
  if (!before || before.archivedAt) return { error: "Изделие не найдено." };

  const currentPrice = before.prices[0]?.price;
  const priceChanged = !currentPrice || money(currentPrice) !== money(parsed.data.price);

  await prisma.product.update({
    where: { id },
    data: {
      name: parsed.data.name,
      category: parsed.data.category,
      photoUrl: parsed.data.photoUrl || null,
      saleUnitId: parsed.data.saleUnitId,
      outputUnitId: parsed.data.outputUnitId,
      minPrice: parsed.data.minPrice,
      recipeBaseQty: parsed.data.recipeBaseQty,
      outputPerBase: parsed.data.outputPerBase,
    },
  });

  if (priceChanged) {
    await setPrice(id, parsed.data.price, session.user.id);
    await notifyRoles(["owner", "director"], {
      type: "price",
      title: "Изменена цена",
      body: `${before.name}: ${currentPrice?.toString() ?? "—"} → ${parsed.data.price}`,
      entityType: "product",
      entityId: id,
    });
  }

  await writeAudit({
    userId: session.user.id,
    action: "product.update",
    entityType: "product",
    entityId: id,
    oldValue: {
      name: before.name,
      price: currentPrice?.toString() ?? null,
    },
    newValue: {
      name: parsed.data.name,
      price: parsed.data.price,
      priceChanged,
    },
  });

  revalidatePath("/products");
  revalidatePath(`/products/${id}`);
  return { ok: true };
}

export async function archiveProduct(formData: FormData) {
  const session = await requirePermission("products.manage");
  const id = String(formData.get("id") ?? "");
  const before = await prisma.product.findUnique({ where: { id } });
  if (!before) return { error: "Изделие не найдено." };

  await prisma.product.update({
    where: { id },
    data: { isActive: false, archivedAt: new Date() },
  });
  await writeAudit({
    userId: session.user.id,
    action: "product.archive",
    entityType: "product",
    entityId: id,
    oldValue: { name: before.name },
    newValue: { archived: true },
  });
  revalidatePath("/products");
  return { ok: true };
}
