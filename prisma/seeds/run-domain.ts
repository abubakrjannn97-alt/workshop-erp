import { createSeedClient } from "./client";
import { seedDomainOnly } from "./orchestrator";

const prisma = createSeedClient();

seedDomainOnly(prisma)
  .then(async ({ domainId }) => {
    console.log(`${domainId} domain seed OK (WORKSHOP_DOMAIN=${process.env.WORKSHOP_DOMAIN ?? "default"}).`);
    await prisma.$disconnect();
  })
  .catch(async (error) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });
