import { createSeedClient } from "./seeds/client";
import { seedWorkerTabDemo } from "./seeds/demo/worker-demo";

const prisma = createSeedClient();

async function main() {
  await seedWorkerTabDemo(prisma);
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (error) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });
