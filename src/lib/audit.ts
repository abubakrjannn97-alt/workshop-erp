import { headers } from "next/headers";
import type { Prisma } from "@prisma/client";
import { prisma } from "./prisma";

type AuditInput = {
  userId?: string | null;
  action: string;
  entityType: string;
  entityId?: string | null;
  oldValue?: Prisma.InputJsonValue | null;
  newValue?: Prisma.InputJsonValue | null;
  ip?: string | null;
  userAgent?: string | null;
};

export async function requestMeta() {
  const h = await headers();
  const forwarded = h.get("x-forwarded-for");
  const ip =
    forwarded?.split(",")[0]?.trim() ||
    h.get("x-real-ip") ||
    null;
  const userAgent = h.get("user-agent");
  return { ip, userAgent };
}

export async function writeAudit(input: AuditInput) {
  let meta = input;
  if (!input.ip && !input.userAgent) {
    try {
      meta = { ...input, ...(await requestMeta()) };
    } catch {
      meta = input;
    }
  }
  await prisma.auditLog.create({
    data: {
      userId: meta.userId ?? null,
      action: meta.action,
      entityType: meta.entityType,
      entityId: meta.entityId ?? null,
      oldValue: meta.oldValue ?? undefined,
      newValue: meta.newValue ?? undefined,
      ip: meta.ip ?? null,
      userAgent: meta.userAgent ?? null,
    },
  });
}
