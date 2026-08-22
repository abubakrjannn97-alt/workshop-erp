"use server";

import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";
import { prisma } from "@core/infrastructure/prisma";
import { requireSession } from "@core/auth/authz";
import { bootstrapWorkshopStructure } from "@core/workshop/bootstrap-workshop";
import {
  slugifyWorkshopName,
  WORKSHOP_COOKIE,
  userCanAccessWorkshop,
  listUserWorkshops,
  resolveActiveWorkshopId,
  runWithWorkshop,
} from "@core/workshop/workshop-context";

export async function switchWorkshopAction(workshopId: string) {
  const session = await requireSession();
  const allowed = await userCanAccessWorkshop(session.user.id, session.user.roleCode ?? "employee", workshopId);
  if (!allowed) {
    return { ok: false as const, error: "Нет доступа к этому цеху" };
  }

  const workshop = await prisma.workshop.findFirst({
    where: { id: workshopId, isActive: true },
    select: { id: true },
  });
  if (!workshop) {
    return { ok: false as const, error: "Цех не найден" };
  }

  const jar = await cookies();
  jar.set(WORKSHOP_COOKIE, workshopId, {
    path: "/",
    maxAge: 60 * 60 * 24 * 365,
    sameSite: "lax",
  });

  // Make sure subsequent work in this request (and prisma cookie fallback) sees the new workshop.
  const { enterWorkshopContext, patchWorkshopContext } = await import("@core/workshop/workshop-storage");
  if (!patchWorkshopContext(workshopId)) {
    enterWorkshopContext(workshopId);
  }

  revalidatePath("/", "layout");
  revalidatePath("/");
  return { ok: true as const };
}

export async function createWorkshopAction(name: string) {
  const session = await requireSession();
  if (session.user.roleCode !== "owner" && session.user.roleCode !== "director") {
    return { ok: false as const, error: "Только владелец может добавлять цеха" };
  }

  const trimmed = name.trim();
  if (trimmed.length < 2) {
    return { ok: false as const, error: "Введите название цеха" };
  }

  let slug = slugifyWorkshopName(trimmed);
  let suffix = 1;
  while (await prisma.workshop.findUnique({ where: { slug } })) {
    slug = `${slugifyWorkshopName(trimmed)}-${suffix++}`;
  }

  const workshop = await prisma.workshop.create({
    data: {
      name: trimmed,
      slug,
      members: {
        create: { userId: session.user.id },
      },
    },
    select: { id: true, name: true },
  });

  await runWithWorkshop(workshop.id, () => bootstrapWorkshopStructure(prisma, workshop.id));

  const jar = await cookies();
  jar.set(WORKSHOP_COOKIE, workshop.id, {
    path: "/",
    maxAge: 60 * 60 * 24 * 365,
    sameSite: "lax",
  });

  revalidatePath("/", "layout");
  return { ok: true as const, workshop };
}

export async function listWorkshopsForUserAction() {
  const session = await requireSession();
  const workshops = await listUserWorkshops(session.user.id, session.user.roleCode ?? "employee");
  const activeId = await resolveActiveWorkshopId(session.user.id, session.user.roleCode ?? "employee");
  return { workshops, activeId };
}
