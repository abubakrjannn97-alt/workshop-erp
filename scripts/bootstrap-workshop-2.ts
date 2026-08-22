import { PrismaClient } from "@prisma/client";
import { bootstrapWorkshopStructure } from "../src/core/workshop/bootstrap-workshop";

const prisma = new PrismaClient();
const WS2 = "ws_workshop_2";

async function main() {
  const settings = await prisma.setting.count({ where: { workshopId: WS2 } });
  const warehouses = await prisma.warehouse.count({ where: { workshopId: WS2 } });
  const orders = await prisma.order.count({ where: { workshopId: WS2 } });
  const payments = await prisma.payment.count({ where: { workshopId: WS2 } });
  const materials = await prisma.material.count({ where: { workshopId: WS2 } });
  console.log({ settings, warehouses, orders, payments, materials });
  if (settings === 0) {
    await bootstrapWorkshopStructure(prisma, WS2);
    console.log("bootstrapped workshop 2");
  }
  await prisma.$disconnect();
}

main();
