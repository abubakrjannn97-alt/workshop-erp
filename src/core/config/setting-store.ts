import type { Prisma } from "@prisma/client";
import { prisma } from "@core/infrastructure/prisma";
import { DEFAULT_WORKSHOP_ID } from "@core/workshop/workshop-context";
import { getWorkshopIdFromContext } from "@core/workshop/workshop-storage";

type SettingDb = Prisma.TransactionClient | typeof prisma;

export function resolveSettingWorkshopId(workshopId?: string) {
  return workshopId ?? getWorkshopIdFromContext() ?? DEFAULT_WORKSHOP_ID;
}

export function settingWhereUnique(key: string, workshopId?: string): Prisma.SettingWhereUniqueInput {
  return { workshopId_key: { workshopId: resolveSettingWorkshopId(workshopId), key } };
}

export async function findSetting(key: string, workshopId?: string, db: SettingDb = prisma) {
  return db.setting.findUnique({ where: settingWhereUnique(key, workshopId) });
}

export async function findSettingsByKeys(keys: string[], workshopId?: string, db: SettingDb = prisma) {
  const wsId = resolveSettingWorkshopId(workshopId);
  return db.setting.findMany({ where: { workshopId: wsId, key: { in: keys } } });
}

export async function upsertSetting(
  key: string,
  value: Prisma.InputJsonValue,
  updatedBy?: string | null,
  workshopId?: string,
  db: SettingDb = prisma,
) {
  const wsId = resolveSettingWorkshopId(workshopId);
  return db.setting.upsert({
    where: settingWhereUnique(key, wsId),
    update: { value, updatedBy: updatedBy ?? null },
    create: { workshopId: wsId, key, value, updatedBy: updatedBy ?? null },
  });
}
