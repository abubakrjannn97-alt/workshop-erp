import type { Prisma } from "@prisma/client";
import { prisma } from "@core/infrastructure/prisma";

type Db = typeof prisma | Prisma.TransactionClient;

export function canSelfApprove(roleCode: string | undefined) {
  return roleCode === "owner" || roleCode === "director";
}

export class PeriodClosedError extends Error {
  readonly month: number;
  readonly year: number;

  constructor(month: number, year: number) {
    super(`Период ${month}.${year} закрыт.`);
    this.name = "PeriodClosedError";
    this.month = month;
    this.year = year;
  }
}

export function isPeriodClosedError(error: unknown): error is PeriodClosedError {
  return error instanceof PeriodClosedError;
}

export async function assertPeriodOpen(at = new Date(), tx?: Prisma.TransactionClient) {
  const db: Db = tx ?? prisma;
  const year = at.getFullYear();
  const month = at.getMonth() + 1;
  const period = await db.accountingPeriod.findUnique({
    where: { year_month: { year, month } },
  });
  if (period?.status === "CLOSED") {
    throw new PeriodClosedError(month, year);
  }
}

export async function notifyRoles(roleCodes: string[], input: {
  type: string;
  title: string;
  body: string;
  entityType?: string;
  entityId?: string;
}) {
  const users = await prisma.user.findMany({
    where: { archivedAt: null, isActive: true, role: { code: { in: roleCodes } } },
    select: { id: true },
  });
  if (users.length === 0) return;
  await prisma.notification.createMany({
    data: users.map((u) => ({
      userId: u.id,
      type: input.type,
      title: input.title,
      body: input.body,
      entityType: input.entityType ?? null,
      entityId: input.entityId ?? null,
    })),
  });
}

export async function queueApproval(input: {
  type: string;
  title: string;
  reason?: string;
  entityType: string;
  entityId?: string;
  payload: Prisma.InputJsonValue;
  requestedById: string;
}) {
  const row = await prisma.approvalRequest.create({
    data: {
      type: input.type,
      status: "PENDING",
      title: input.title,
      reason: input.reason ?? null,
      entityType: input.entityType,
      entityId: input.entityId ?? null,
      payload: input.payload,
      requestedById: input.requestedById,
    },
  });
  await notifyRoles(["owner", "director"], {
    type: "approval",
    title: "Требуется подтверждение",
    body: input.title,
    entityType: "approval",
    entityId: row.id,
  });
  return row;
}

export async function pendingFor(entityType: string, entityId: string, type?: string) {
  return prisma.approvalRequest.findFirst({
    where: {
      status: "PENDING",
      entityType,
      entityId,
      ...(type ? { type } : {}),
    },
  });
}
