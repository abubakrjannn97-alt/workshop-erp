"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/authz";
import { writeAudit } from "@/lib/audit";
import { qty } from "@/lib/decimal";
import { canSelfApprove, notifyRoles, queueApproval } from "@/lib/control";

const itemSchema = z.object({
  materialId: z.string().min(1),
  quantity: z.string().regex(/^\d+(\.\d{1,6})?$/, "Количество"),
  unitId: z.string().min(1),
});

export async function publishRecipeVersion(formData: FormData) {
  const session = await requirePermission("recipes.manage");
  const productId = String(formData.get("productId") ?? "");
  const comment = String(formData.get("comment") ?? "").trim();
  if (!productId) return { error: "Нет изделия." };

  const materialIds = formData.getAll("materialId").map(String);
  const quantities = formData.getAll("quantity").map(String);
  const unitIds = formData.getAll("unitId").map(String);

  const items = materialIds
    .map((materialId, index) => ({
      materialId,
      quantity: quantities[index] ?? "",
      unitId: unitIds[index] ?? "",
    }))
    .filter((item) => item.materialId && item.quantity && item.unitId);

  if (items.length === 0) return { error: "Добавьте хотя бы один компонент." };

  if (!canSelfApprove(session.user.roleCode) && String(formData.get("_approved") ?? "") !== "1") {
    await queueApproval({
      type: "RECIPE",
      title: "Изменение рецептуры",
      reason: comment || undefined,
      entityType: "product",
      entityId: productId,
      payload: {
        productId,
        comment,
        materialId: materialIds,
        quantity: quantities,
        unitId: unitIds,
      },
      requestedById: session.user.id,
    });
    return { ok: true, pending: true };
  }

  for (const item of items) {
    const parsed = itemSchema.safeParse(item);
    if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Ошибка строки рецептуры." };
  }

  const product = await prisma.product.findUnique({
    where: { id: productId },
    include: {
      recipe: {
        include: {
          versions: {
            where: { validTo: null },
            include: { items: true },
            orderBy: { versionNumber: "desc" },
            take: 1,
          },
        },
      },
    },
  });
  if (!product) return { error: "Изделие не найдено." };

  const recipe =
    product.recipe ??
    (await prisma.recipe.create({ data: { productId } }));

  const current = await prisma.recipeVersion.findFirst({
    where: { recipeId: recipe.id },
    orderBy: { versionNumber: "desc" },
    include: { items: true },
  });

  const nextNumber = (current?.versionNumber ?? 0) + 1;
  const now = new Date();

  const version = await prisma.$transaction(async (tx) => {
    await tx.recipeVersion.updateMany({
      where: { recipeId: recipe.id, validTo: null },
      data: { validTo: now },
    });
    return tx.recipeVersion.create({
      data: {
        recipeId: recipe.id,
        versionNumber: nextNumber,
        validFrom: now,
        comment: comment || null,
        createdById: session.user.id,
        items: {
          create: items.map((item) => ({
            materialId: item.materialId,
            quantity: item.quantity,
            unitId: item.unitId,
          })),
        },
      },
    });
  });

  await writeAudit({
    userId: session.user.id,
    action: "recipe.version.publish",
    entityType: "recipe_version",
    entityId: version.id,
    oldValue: current
      ? {
          versionNumber: current.versionNumber,
          items: current.items.map((i) => ({
            materialId: i.materialId,
            quantity: qty(i.quantity),
          })),
        }
      : null,
    newValue: {
      versionNumber: nextNumber,
      items: items.map((i) => ({ materialId: i.materialId, quantity: i.quantity })),
    },
  });

  await notifyRoles(["owner", "director"], {
    type: "recipe",
    title: "Изменена рецептура",
    body: `${product.name}: версия ${nextNumber}`,
    entityType: "product",
    entityId: productId,
  });
  revalidatePath(`/products/${productId}`);
  revalidatePath("/products");
  return { ok: true };
}
