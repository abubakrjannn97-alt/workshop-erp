import { PrismaClient } from "@prisma/client";
import {
  ALLOWED_WORKSHOP_IDS,
  DEFAULT_WORKSHOP_ID,
  WORKSHOP_2_ID,
} from "../src/core/workshop/workshop-context";
import { bootstrapWorkshopStructure, ensureTwoWorkshops } from "../src/core/workshop/bootstrap-workshop";

const prisma = new PrismaClient();

async function main() {
  const removed = await prisma.workshop.deleteMany({
    where: { id: { notIn: [...ALLOWED_WORKSHOP_IDS] } },
  });
  console.log(`Removed ${removed.count} extra workshop(s).`);

  await ensureTwoWorkshops(prisma);
  await bootstrapWorkshopStructure(prisma, DEFAULT_WORKSHOP_ID);
  await bootstrapWorkshopStructure(prisma, WORKSHOP_2_ID);

  const owners = await prisma.user.findMany({
    where: { role: { code: { in: ["owner", "director"] } } },
    select: { id: true },
  });
  for (const owner of owners) {
    for (const workshopId of ALLOWED_WORKSHOP_IDS) {
      await prisma.userWorkshop.upsert({
        where: { userId_workshopId: { userId: owner.id, workshopId } },
        update: {},
        create: { userId: owner.id, workshopId },
      });
    }
  }

  const workshops = await prisma.workshop.findMany({ orderBy: { slug: "asc" } });
  console.log(
    "Workshops:",
    workshops.map((w) => `${w.name} (${w.id})`).join(", "),
  );
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
