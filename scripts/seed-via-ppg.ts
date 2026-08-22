import { prisma } from "../src/core/infrastructure/prisma.ts";
import { seedWorkshop } from "../prisma/seeds/orchestrator.ts";

async function main() {
  process.env.SEED_DEMO = process.env.SEED_DEMO ?? "0";
  process.env.OWNER_PHONE = process.env.OWNER_PHONE ?? "900000001";
  const result = await seedWorkshop(prisma);
  console.log("seed ok", result);
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
