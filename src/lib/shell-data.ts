import { prisma } from "@/lib/prisma";
import { DEFAULT_SETTINGS, SETTING_KEYS } from "@/lib/settings";

export async function getShellData(userId: string) {
  try {
    const [company, unread] = await Promise.all([
      prisma.setting.findUnique({ where: { key: SETTING_KEYS.companyName } }),
      prisma.notification.count({ where: { userId, readAt: null } }),
    ]);
    return {
      companyName:
        typeof company?.value === "string" ? company.value : DEFAULT_SETTINGS.companyName,
      unread,
    };
  } catch (error) {
    console.error("getShellData failed:", error);
    return {
      companyName: DEFAULT_SETTINGS.companyName,
      unread: 0,
    };
  }
}
