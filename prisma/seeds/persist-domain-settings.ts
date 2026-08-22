import type { PrismaClient } from "@prisma/client";
import {
  domainSettingsFromPreset,
  type DomainSettingsSource,
} from "../../src/core/config/settings";
import { DEFAULT_WORKSHOP_ID } from "../../src/core/workshop/workshop-context";
import { upsertSetting } from "../../src/core/config/setting-store";

/** Upsert DOMAIN_SETTING_KEYS from a registry preset (any clone). */
export async function persistDomainSettings(
  prisma: PrismaClient,
  preset: DomainSettingsSource,
): Promise<void> {
  const mapping = domainSettingsFromPreset(preset);
  for (const [key, value] of Object.entries(mapping)) {
    await upsertSetting(key, value, null, DEFAULT_WORKSHOP_ID, prisma);
  }
}
