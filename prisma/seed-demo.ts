import { PrismaClient } from "@prisma/client";
import { seedWorkshopHistory } from "./seed-history";

const prisma = new PrismaClient();

seedWorkshopHistory(prisma, { force: true })
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (error) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });
