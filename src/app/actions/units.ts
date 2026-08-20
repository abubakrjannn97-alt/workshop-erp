"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@core/infrastructure/prisma";
import { requirePermission } from "@core/auth/authz";
import { writeAudit } from "@core/control/audit";

const schema = z.object({
  code: z.string().trim().min(1).max(16).regex(/^[A-Z0-9_]+$/, "Код: латиница, цифры, _"),
  name: z.string().trim().min(1).max(80),
  symbol: z.string().trim().min(1).max(24),
  category: z.enum(["mass", "area", "count", "length", "volume", "other"]),
  isBase: z.boolean(),
  baseUnitId: z.string().optional().nullable(),
  toBaseFactor: z.string().regex(/^\d+(\.\d{1,6})?$/, "Коэффициент должен быть числом"),
});

function autoUnitCode(symbol: string, name: string) {
  const fromSymbol = symbol
    .normalize("NFKD")
    .replace(/[^\w]/g, "")
    .toUpperCase()
    .slice(0, 12);
  if (/^[A-Z0-9_]+$/.test(fromSymbol) && fromSymbol.length > 0) return fromSymbol;
  const fromName = name
    .normalize("NFKD")
    .replace(/[^\w]+/g, "_")
    .toUpperCase()
    .replace(/^_|_$/g, "")
    .slice(0, 12);
  if (/^[A-Z0-9_]+$/.test(fromName) && fromName.length > 0) return fromName;
  return `U_${Date.now().toString(36).toUpperCase().slice(-8)}`;
}

export async function createUnit(formData: FormData) {
  const session = await requirePermission("units.manage");
  const name = String(formData.get("name") ?? "").trim();
  const symbol = String(formData.get("symbol") ?? "").trim();
  const rawCode = String(formData.get("code") ?? "").trim().toUpperCase();
  const parsed = schema.safeParse({
    code: rawCode || autoUnitCode(symbol, name),
    name,
    symbol,
    category: String(formData.get("category") ?? "other") || "other",
    isBase: formData.get("isBase") === "on",
    baseUnitId: formData.get("baseUnitId") || null,
    toBaseFactor: String(formData.get("toBaseFactor") ?? "1") || "1",
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Проверьте поля." };
  }

  let code = parsed.data.code;
  const existing = await prisma.unit.findUnique({ where: { code } });
  if (existing) {
    code = `${code}_${Date.now().toString(36).toUpperCase().slice(-4)}`.slice(0, 16);
  }

  const unit = await prisma.unit.create({
    data: {
      code,
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
    newValue: { ...parsed.data, code },
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
