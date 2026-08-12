"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/authz";
import { writeAudit } from "@/lib/audit";

const schema = z.object({
  code: z.string().trim().min(1).max(16).regex(/^[A-Z0-9_]+$/, "Код: латиница, цифры, _"),
  name: z.string().trim().min(1).max(80),
  symbol: z.string().trim().min(1).max(24),
  category: z.enum(["mass", "area", "count", "length", "volume", "other"]),
  isBase: z.boolean(),
  baseUnitId: z.string().optional().nullable(),
  toBaseFactor: z.string().regex(/^\d+(\.\d{1,6})?$/, "Коэффициент должен быть числом"),
});

export async function createUnit(formData: FormData) {
  const session = await requirePermission("units.manage");
  const parsed = schema.safeParse({
    code: String(formData.get("code") ?? "").toUpperCase(),
    name: formData.get("name"),
    symbol: formData.get("symbol"),
    category: formData.get("category"),
    isBase: formData.get("isBase") === "on",
    baseUnitId: formData.get("baseUnitId") || null,
    toBaseFactor: formData.get("toBaseFactor") || "1",
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Проверьте поля." };
  }

  const existing = await prisma.unit.findUnique({ where: { code: parsed.data.code } });
  if (existing) return { error: "Единица с таким кодом уже есть." };

  const unit = await prisma.unit.create({
    data: {
      code: parsed.data.code,
      name: parsed.data.name,
      symbol: parsed.data.symbol,
      category: parsed.data.category,
      isBase: parsed.data.isBase,
      baseUnitId: parsed.data.isBase ? null : parsed.data.baseUnitId || null,
      toBaseFactor: parsed.data.toBaseFactor,
    },
  });

  await writeAudit({
    userId: session.user.id,
    action: "unit.create",
    entityType: "unit",
    entityId: unit.id,
    newValue: parsed.data,
  });

  revalidatePath("/settings/units");
  return { ok: true };
}

export async function updateUnit(formData: FormData) {
  const session = await requirePermission("units.manage");
  const id = String(formData.get("id") ?? "");
  const parsed = schema.omit({ code: true }).safeParse({
    name: formData.get("name"),
    symbol: formData.get("symbol"),
    category: formData.get("category"),
    isBase: formData.get("isBase") === "on",
    baseUnitId: formData.get("baseUnitId") || null,
    toBaseFactor: formData.get("toBaseFactor") || "1",
  });

  if (!id || !parsed.success) {
    return { error: parsed.success ? "Нет идентификатора." : parsed.error.issues[0]?.message };
  }

  const before = await prisma.unit.findUnique({ where: { id } });
  if (!before || before.archivedAt) return { error: "Единица не найдена." };

  const unit = await prisma.unit.update({
    where: { id },
    data: {
      name: parsed.data.name,
      symbol: parsed.data.symbol,
      category: parsed.data.category,
      isBase: parsed.data.isBase,
      baseUnitId: parsed.data.isBase ? null : parsed.data.baseUnitId || null,
      toBaseFactor: parsed.data.toBaseFactor,
    },
  });

  await writeAudit({
    userId: session.user.id,
    action: "unit.update",
    entityType: "unit",
    entityId: unit.id,
    oldValue: {
      name: before.name,
      symbol: before.symbol,
      toBaseFactor: before.toBaseFactor.toString(),
    },
    newValue: parsed.data,
  });

  revalidatePath("/settings/units");
  return { ok: true };
}

export async function archiveUnit(formData: FormData) {
  const session = await requirePermission("units.manage");
  const id = String(formData.get("id") ?? "");
  const before = await prisma.unit.findUnique({ where: { id } });
  if (!before) return { error: "Единица не найдена." };

  await prisma.unit.update({
    where: { id },
    data: { isActive: false, archivedAt: new Date() },
  });

  await writeAudit({
    userId: session.user.id,
    action: "unit.archive",
    entityType: "unit",
    entityId: id,
    oldValue: { code: before.code, isActive: before.isActive },
    newValue: { isActive: false },
  });

  revalidatePath("/settings/units");
  return { ok: true };
}
