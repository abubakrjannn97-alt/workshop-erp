import { createSeedClient } from "./client";
import { seedBakeryDomain } from "./domains/bakery";

const prisma = createSeedClient();

seedBakeryDomain(prisma)
  .then(async () => {
    console.log("Bakery domain seed OK.");
    await prisma.$disconnect();
  })
  .catch(async (error) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });
