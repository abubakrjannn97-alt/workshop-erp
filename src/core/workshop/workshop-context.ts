import { AsyncLocalStorage } from "async_hooks";
import { cookies } from "next/headers";
import { prisma } from "@core/infrastructure/prisma";

export const DEFAULT_WORKSHOP_ID = "ws_default_main";
export const WORKSHOP_COOKIE = "active_workshop_id";

const workshopStorage = new AsyncLocalStorage<{ workshopId: string }>();

export function getWorkshopIdFromContext(): string | undefined {
  return workshopStorage.getStore()?.workshopId;
}

export function runWithWorkshop<T>(workshopId: string, fn: () => T): T {
  return workshopStorage.run({ workshopId }, fn);
}

export async function listUserWorkshops(userId: string, roleCode: string) {
  if (roleCode === "owner" || roleCode === "director") {
    return prisma.workshop.findMany({
      where: { isActive: true },
      orderBy: { createdAt: "asc" },
      select: { id: true, name: true, slug: true },
    });
  }
  return prisma.workshop.findMany({
    where: {
      isActive: true,
      members: { some: { userId } },
    },
    orderBy: { createdAt: "asc" },
    select: { id: true, name: true, slug: true },
  });
}

export async function userCanAccessWorkshop(userId: string, roleCode: string, workshopId: string) {
  if (roleCode === "owner" || roleCode === "director") return true;
  const row = await prisma.userWorkshop.findUnique({
    where: { userId_workshopId: { userId, workshopId } },
    select: { userId: true },
  });
  return Boolean(row);
}

export async function resolveActiveWorkshopId(userId: string, roleCode: string): Promise<string> {
  const jar = await cookies();
  const fromCookie = jar.get(WORKSHOP_COOKIE)?.value?.trim();
  if (fromCookie && (await userCanAccessWorkshop(userId, roleCode, fromCookie))) {
    return fromCookie;
  }

  const workshops = await listUserWorkshops(userId, roleCode);
  if (workshops.length > 0) return workshops[0]!.id;
  return DEFAULT_WORKSHOP_ID;
}

export async function bindWorkshopContext(userId: string, roleCode: string): Promise<string> {
  const workshopId = await resolveActiveWorkshopId(userId, roleCode);
  const store = workshopStorage.getStore();
  if (store) {
    store.workshopId = workshopId;
    return workshopId;
  }
  // When called outside runWithWorkshop, set ALS for remainder of async chain via enterWith
  workshopStorage.enterWith({ workshopId });
  return workshopId;
}

export function slugifyWorkshopName(name: string) {
  const base = name
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9\u0400-\u04ff]+/gi, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40);
  return base || "workshop";
}
