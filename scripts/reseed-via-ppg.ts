import { prisma } from "../src/core/infrastructure/prisma.ts";
import { reseedFacadeCatalog } from "../prisma/seeds/reseed-facade-catalog.ts";

process.env.REPLACE_CATALOG = "1";

reseedFacadeCatalog(prisma)
  .then((r) => console.log("reseed ok", r))
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
