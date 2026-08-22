import { cookies } from "next/headers";
import { prisma } from "@core/infrastructure/prisma";
import {
  enterWorkshopContext,
  getWorkshopIdFromContext,
  patchWorkshopContext,
} from "./workshop-storage";

export { getWorkshopIdFromContext, runWithWorkshop } from "./workshop-storage";

export const DEFAULT_WORKSHOP_ID = "ws_default_main";
export const WORKSHOP_2_ID = "ws_workshop_2";
export const ALLOWED_WORKSHOP_IDS = [DEFAULT_WORKSHOP_ID, WORKSHOP_2_ID] as const;
export const WORKSHOP_COOKIE = "active_workshop_id";

export async function listUserWorkshops(userId: string, roleCode: string) {
  const baseWhere = {
    isActive: true,
    id: { in: [...ALLOWED_WORKSHOP_IDS] },
  };
  if (roleCode === "owner" || roleCode === "director") {
    return prisma.workshop.findMany({
      where: baseWhere,
      orderBy: { slug: "asc" },
      select: { id: true, name: true, slug: true },
    });
  }
  return prisma.workshop.findMany({
    where: {
      ...baseWhere,
      members: { some: { userId } },
    },
    orderBy: { slug: "asc" },
    select: { id: true, name: true, slug: true },
  });
}

export async function userCanAccessWorkshop(userId: string, roleCode: string, workshopId: string) {
  if (!ALLOWED_WORKSHOP_IDS.includes(workshopId as (typeof ALLOWED_WORKSHOP_IDS)[number])) return false;
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
  if (!patchWorkshopContext(workshopId)) {
    enterWorkshopContext(workshopId);
  }
  return workshopId;
}

export function requireWorkshopId(): string {
  return getWorkshopIdFromContext() ?? DEFAULT_WORKSHOP_ID;
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
