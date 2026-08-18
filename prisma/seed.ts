import { createSeedClient } from "./seeds/client";
import { seedWorkshop } from "./seeds/orchestrator";

const prisma = createSeedClient();

seedWorkshop(prisma)
  .then(async (result) => {
    console.log(
      `Seed OK: domain=${result.domainId} demo=${result.demoSeeded ? "yes" : "no"} (WORKSHOP_DOMAIN=${process.env.WORKSHOP_DOMAIN ?? "default"})`,
    );
    await prisma.$disconnect();
  })
  .catch(async (error) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });
