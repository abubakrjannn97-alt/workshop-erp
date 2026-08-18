import { prisma } from "@core/infrastructure/prisma";

export async function upsertProductionStage(input: {
  code: string;
  name: string;
  sortOrder: number;
  isActive?: boolean;
}) {
  const code = input.code.trim().toUpperCase().replace(/\s+/g, "_");
  if (!code || !input.name.trim()) throw new Error("Код и название этапа обязательны.");
  return prisma.productionStage.upsert({
    where: { code },
    update: {
      name: input.name.trim(),
      sortOrder: input.sortOrder,
      isActive: input.isActive ?? true,
    },
    create: {
      code,
      name: input.name.trim(),
      sortOrder: input.sortOrder,
      isActive: input.isActive ?? true,
    },
  });
}

export async function setProductionOrderStage(productionOrderId: string, stageId: string | null) {
  if (stageId) {
    const stage = await prisma.productionStage.findUnique({ where: { id: stageId } });
    if (!stage || !stage.isActive) throw new Error("Этап не найден.");
  }
  return prisma.productionOrder.update({
    where: { id: productionOrderId },
    data: { stageId },
  });
}
