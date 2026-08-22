"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@core/infrastructure/prisma";
import { requirePermission } from "@core/auth/authz";
import { writeAudit } from "@core/control/audit";
import { SETTING_KEYS } from "@core/config/settings";
import { findSettingsByKeys, upsertSetting } from "@core/config/setting-store";

const schema = z.object({
  companyName: z.string().trim().min(1).max(200),
  logoUrl: z.string().trim().max(2000),
  currencyCode: z.string().trim().min(1).max(8),
  currencyName: z.string().trim().min(1).max(40),
  timezone: z.string().trim().min(1).max(64),
  discountLimitPercent: z
    .string()
    .trim()
    .regex(/^\d+(\.\d{1,2})?$/, "Некорректный лимит скидки"),
  opexReservePercent: z
    .string()
    .trim()
    .regex(/^\d+(\.\d{1,2})?$/, "Некорректный резерв OPEX"),
});

export async function updateBusinessSettings(formData: FormData) {
  const session = await requirePermission("settings.edit");

  const parsed = schema.safeParse({
    companyName: formData.get("companyName"),
    logoUrl: formData.get("logoUrl") ?? "",
    currencyCode: formData.get("currencyCode"),
    currencyName: formData.get("currencyName"),
    timezone: formData.get("timezone"),
    discountLimitPercent: formData.get("discountLimitPercent"),
    opexReservePercent: formData.get("opexReservePercent") || "0",
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Проверьте поля." };
  }

  const mapping: Record<string, string> = {
    [SETTING_KEYS.companyName]: parsed.data.companyName,
    [SETTING_KEYS.logoUrl]: parsed.data.logoUrl,
    [SETTING_KEYS.currencyCode]: parsed.data.currencyCode,
    [SETTING_KEYS.currencyName]: parsed.data.currencyName,
    [SETTING_KEYS.timezone]: parsed.data.timezone,
    [SETTING_KEYS.discountLimitPercent]: parsed.data.discountLimitPercent,
    [SETTING_KEYS.opexReservePercent]: parsed.data.opexReservePercent,
  };

  const previous = await findSettingsByKeys(Object.keys(mapping));

  await prisma.$transaction(
    Object.entries(mapping).map(([key, value]) =>
      upsertSetting(key, value, session.user.id),
    ),
  );

  await writeAudit({
    userId: session.user.id,
    action: "settings.update",
    entityType: "settings",
    entityId: "business",
    oldValue: Object.fromEntries(previous.map((s) => [s.key, s.value])),
    newValue: mapping,
  });

  revalidatePath("/settings");
  return { ok: true };
}

export async function savePaymentCards(formData: FormData) {
  const session = await requirePermission("settings.edit");
  let cardsRaw = String(formData.get("cardsJson") ?? "").trim();
  if (!cardsRaw) return { error: "Нет данных карт." };
  let parsed: unknown;
  try {
    parsed = JSON.parse(cardsRaw);
  } catch {
    return { error: "Некорректный формат карт." };
  }
  if (!Array.isArray(parsed) || parsed.length === 0) {
    return { error: "Добавьте хотя бы одну карту." };
  }
  const cards = parsed.filter(
    (c: { id?: string; name?: string; bank?: string; logoUrl?: string }) =>
      c?.id && c?.name && c?.bank && c?.logoUrl,
  );
  if (cards.length === 0) return { error: "Проверьте поля карт." };

  await upsertSetting(SETTING_KEYS.paymentCards, JSON.stringify(cards), session.user.id);

  await writeAudit({
    userId: session.user.id,
    action: "settings.payment_cards",
    entityType: "settings",
    entityId: "payment_cards",
    newValue: { count: cards.length },
  });

  revalidatePath("/settings");
  revalidatePath("/orders/quick");
  return { ok: true };
}

export async function renameOrderStatus(formData: FormData) {
  const session = await requirePermission("settings.edit");
  const id = String(formData.get("id") ?? "");
  const name = String(formData.get("name") ?? "").trim();
  if (!id || !name) return { error: "Название статуса." };
  await prisma.orderStatus.update({ where: { id }, data: { name } });
  await writeAudit({
    userId: session.user.id,
    action: "order_status.rename",
    entityType: "order_status",
    entityId: id,
    newValue: { name },
  });
  revalidatePath("/settings");
  return { ok: true };
}

export async function renameLeadStage(formData: FormData) {
  const session = await requirePermission("settings.edit");
  const id = String(formData.get("id") ?? "");
  const name = String(formData.get("name") ?? "").trim();
  if (!id || !name) return { error: "Название стадии." };
  await prisma.leadStage.update({ where: { id }, data: { name } });
  await writeAudit({
    userId: session.user.id,
    action: "lead_stage.rename",
    entityType: "lead_stage",
    entityId: id,
    newValue: { name },
  });
  revalidatePath("/settings");
  return { ok: true };
}
