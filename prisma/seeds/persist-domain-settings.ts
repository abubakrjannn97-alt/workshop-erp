import type { PrismaClient } from "@prisma/client";
import {
  domainSettingsFromPreset,
  type DomainSettingsSource,
} from "../../src/core/config/settings";

/** Upsert DOMAIN_SETTING_KEYS from a registry preset (any clone). */
export async function persistDomainSettings(
  prisma: PrismaClient,
  preset: DomainSettingsSource,
): Promise<void> {
  const mapping = domainSettingsFromPreset(preset);
  for (const [key, value] of Object.entries(mapping)) {
    await prisma.setting.upsert({
      where: { key },
      update: { value },
      create: { key, value },
    });
  }
}
