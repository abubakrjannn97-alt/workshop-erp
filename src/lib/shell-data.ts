import { unstable_cache } from "next/cache";
import { prisma } from "@/lib/prisma";
import { DEFAULT_SETTINGS, SETTING_KEYS } from "@/lib/settings";

export function getShellData(userId: string) {
  return unstable_cache(
    async () => {
      const [company, unread] = await Promise.all([
        prisma.setting.findUnique({ where: { key: SETTING_KEYS.companyName } }),
        prisma.notification.count({ where: { userId, readAt: null } }),
      ]);
      return {
        companyName:
          typeof company?.value === "string" ? company.value : DEFAULT_SETTINGS.companyName,
        unread,
      };
    },
    ["shell-data", userId],
    { revalidate: 15 },
  )();
}
