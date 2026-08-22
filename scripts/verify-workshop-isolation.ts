import { PrismaClient } from "@prisma/client";

const DEFAULT_WORKSHOP_ID = "ws_default_main";
const WORKSHOP_2_ID = "ws_workshop_2";

async function main() {
  const prisma = new PrismaClient();

  await prisma.workshop.upsert({
    where: { id: DEFAULT_WORKSHOP_ID },
    update: { name: "Цех 1", slug: "ceh-1", isActive: true },
    create: { id: DEFAULT_WORKSHOP_ID, name: "Цех 1", slug: "ceh-1", isActive: true },
  });
  await prisma.workshop.upsert({
    where: { id: WORKSHOP_2_ID },
    update: { name: "Цех 2", slug: "ceh-2", isActive: true },
    create: { id: WORKSHOP_2_ID, name: "Цех 2", slug: "ceh-2", isActive: true },
  });

  const { bootstrapWorkshopStructure } = await import("../src/core/workshop/bootstrap-workshop");
  for (const id of [DEFAULT_WORKSHOP_ID, WORKSHOP_2_ID]) {
    const n = await prisma.setting.count({ where: { workshopId: id } });
    if (n === 0) {
      console.log("bootstrapping", id);
      await bootstrapWorkshopStructure(prisma, id);
    }
  }

  const checks = {
    orders: await prisma.order.groupBy({ by: ["workshopId"], _count: true }),
    customers: await prisma.customer.groupBy({ by: ["workshopId"], _count: true }),
    payments: await prisma.payment.groupBy({ by: ["workshopId"], _count: true }),
    materials: await prisma.material.groupBy({ by: ["workshopId"], _count: true }),
    products: await prisma.product.groupBy({ by: ["workshopId"], _count: true }),
    stockItems: await prisma.stockItem.groupBy({ by: ["workshopId"], _count: true }),
    stockMovements: await prisma.stockMovement.groupBy({ by: ["workshopId"], _count: true }),
    ledger: await prisma.ledgerEntry.groupBy({ by: ["workshopId"], _count: true }),
    batches: await prisma.productionBatch.groupBy({ by: ["workshopId"], _count: true }),
    scrap: await prisma.scrapRecord.groupBy({ by: ["workshopId"], _count: true }),
    purchases: await prisma.purchaseOrder.groupBy({ by: ["workshopId"], _count: true }),
  };
  console.log(JSON.stringify(checks, null, 2));
  await prisma.$disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
