import { prisma } from "@core/infrastructure/prisma";
import { money } from "@core/shared/decimal";

export const CRM_DOC = {
  CALCULATION: "CALCULATION",
  OFFER: "OFFER",
} as const;

export async function createCrmDocument(input: {
  leadId: string;
  type: string;
  title: string;
  amount?: string | null;
  payload?: object | null;
  createdById?: string | null;
}) {
  const type = input.type === CRM_DOC.OFFER ? CRM_DOC.OFFER : CRM_DOC.CALCULATION;
  const prefix = type === CRM_DOC.OFFER ? "OFF" : "CALC";
  const last = await prisma.crmDocument.findFirst({
    where: { type },
    orderBy: { createdAt: "desc" },
    select: { number: true },
  });
  const seq = last?.number?.match(/(\d+)$/)?.[1];
  const next = seq ? Number(seq) + 1 : 1001;
  return prisma.crmDocument.create({
    data: {
      leadId: input.leadId,
      type,
      number: `${prefix}-${next}`,
      title: input.title,
      amount: input.amount ? money(input.amount) : null,
      payload: input.payload ?? undefined,
      createdById: input.createdById ?? null,
    },
  });
}
