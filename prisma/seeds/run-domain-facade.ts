import { createSeedClient } from "./client";
import { seedFacadeDomain } from "./domains/facade";

const prisma = createSeedClient();

seedFacadeDomain(prisma)
  .then(async () => {
    console.log("Facade domain seed OK.");
    await prisma.$disconnect();
  })
  .catch(async (error) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });
