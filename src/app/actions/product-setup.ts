"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@core/infrastructure/prisma";
import { requirePermission, hasPermission } from "@core/auth/authz";
import { writeAudit } from "@core/control/audit";
import { D, money } from "@core/shared/decimal";
import { materialCostForRecipe } from "@core/costing/costing";
import { publishRecipeVersion } from "@/app/actions/recipes";

const priceSchema = z.object({
  price: z.string().regex(/^\d+(\.\d{1,4})?$/),
  minPrice: z.string().regex(/^\d+(\.\d{1,4})?$/),
});

/** Step 2: save recipe + client prices. Material unit prices come from purchases, not the recipe form. */
export async function finishProductSetup(formData: FormData) {
  const session = await requirePermission("products.manage");
  const productId = String(formData.get("productId") ?? "");
  if (!productId) return { error: "Нет изделия." };

  const canRecipe =
    session.user.roleCode === "owner" ||
    hasPermission(session.user.permissions, session.user.roleCode, "recipes.manage");
  if (!canRecipe) return { error: "Нет права менять рецепт." };

  const prices = priceSchema.safeParse({
    price: formData.get("price") || "0",
    minPrice: formData.get("minPrice") || "0",
  });
  if (!prices.success) return { error: "Проверьте цены." };

  const recipeResult = await publishRecipeVersion(formData);
  if (recipeResult?.error) return recipeResult;
  if (recipeResult?.pending) return { ok: true, pending: true };

  const product = await prisma.product.findUnique({
    where: { id: productId },
    include: {
      recipe: {
        include: {
          versions: {
            where: { validTo: null },
            take: 1,
            orderBy: { versionNumber: "desc" },
            include: {
              items: {
                include: {
                  material: { include: { storageUnit: true } },
                  unit: true,
                },
              },
            },
          },
        },
      },
      prices: { where: { validTo: null }, take: 1 },
    },
  });
  if (!product) return { error: "Изделие не найдено." };

  const version = product.recipe?.versions[0];
  const cost = version
    ? materialCostForRecipe(
        version.items.map((item) => ({
          material: item.material,
          quantity: item.quantity,
          unit: item.unit,
        })),
      )
    : null;
  const expense = cost?.total ? D(cost.total) : D(0);
  const minPrice = D(prices.data.minPrice);
  const salePrice = D(prices.data.price);

  if (expense.gt(0) && minPrice.lt(expense)) {
    return {
      error: `«Дешевле нельзя» не может быть ниже расхода (${money(expense)} с).`,
    };
  }
  if (salePrice.lt(minPrice)) {
    return { error: "Цена клиенту не может быть ниже «Дешевле нельзя»." };
  }

  await prisma.product.update({
    where: { id: productId },
    data: { minPrice: prices.data.minPrice },
  });

  const current = product.prices[0]?.price;
  if (!current || money(current) !== money(prices.data.price)) {
    await prisma.productPrice.updateMany({
      where: { productId, validTo: null },
      data: { validTo: new Date() },
    });
    await prisma.productPrice.create({
      data: {
        productId,
        price: prices.data.price,
        createdById: session.user.id,
      },
    });
  }

  await writeAudit({
    userId: session.user.id,
    action: "product.setup_finish",
    entityType: "product",
    entityId: productId,
    newValue: {
      price: prices.data.price,
      minPrice: prices.data.minPrice,
      expense: cost?.total ?? null,
    },
  });

  revalidatePath("/products");
  revalidatePath(`/products/${productId}`);
  return { ok: true, expense: cost?.total ?? "0" };
}
