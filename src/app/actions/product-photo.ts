"use server";

import { mkdir, writeFile } from "fs/promises";
import path from "path";
import { revalidatePath } from "next/cache";
import { prisma } from "@core/infrastructure/prisma";
import { requirePermission } from "@core/auth/authz";
import { writeAudit } from "@core/control/audit";

const MAX_BYTES = 2_500_000;

export async function saveProductPhoto(formData: FormData) {
  const session = await requirePermission("products.manage");
  const productId = String(formData.get("productId") ?? "");
  const file = formData.get("photo");
  if (!productId) return { error: "Нет изделия." };
  if (!(file instanceof File) || file.size === 0) return { error: "Выберите фото." };
  if (file.size > MAX_BYTES) return { error: "Фото слишком большое (макс. 2.5 МБ)." };
  if (!file.type.startsWith("image/")) return { error: "Нужен файл изображения." };

  const product = await prisma.product.findUnique({ where: { id: productId } });
  if (!product || product.archivedAt) return { error: "Изделие не найдено." };

  const ext = file.type === "image/png" ? "png" : file.type === "image/webp" ? "webp" : "jpg";
  const dir = path.join(process.cwd(), "public", "uploads", "products");
  await mkdir(dir, { recursive: true });
  const filename = `${productId}-${Date.now()}.${ext}`;
  await writeFile(path.join(dir, filename), Buffer.from(await file.arrayBuffer()));

  const photoUrl = `/uploads/products/${filename}`;
  await prisma.product.update({ where: { id: productId }, data: { photoUrl } });
  await writeAudit({
    userId: session.user.id,
    action: "product.photo",
    entityType: "product",
    entityId: productId,
    newValue: { photoUrl },
  });
  revalidatePath(`/products/${productId}`);
  revalidatePath("/products");
  return { ok: true, url: photoUrl };
}
