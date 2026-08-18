import { createSeedClient } from "./seeds/client";
import { seedWorkshopFacade } from "./seeds/index";

const prisma = createSeedClient();

seedWorkshopFacade(prisma)
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (error) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });
