import { unstable_cache } from "next/cache";
import { prisma } from "@core/infrastructure/prisma";
import { DEFAULT_SETTINGS, SETTING_KEYS } from "@core/config/settings";

export function getShellData(userId: string, workshopId: string) {
  return unstable_cache(
    async () => {
      const [company, unread] = await Promise.all([
        prisma.setting.findUnique({
          where: { workshopId_key: { workshopId, key: SETTING_KEYS.companyName } },
        }),
        prisma.notification.count({ where: { userId, workshopId, readAt: null } }),
      ]);
      return {
        companyName:
          typeof company?.value === "string" ? company.value : DEFAULT_SETTINGS.companyName,
        unread,
      };
    },
    ["shell-data", userId, workshopId],
    { revalidate: 15 },
  )();
}
