/**
 * Wipe old catalog + related stock/orders and reseed facade catalog (with photos).
 *
 * Usage:
 *   REPLACE_CATALOG=1 npx tsx scripts/reseed-facade-catalog.ts
 */
import { PrismaClient } from "@prisma/client";
import { reseedFacadeCatalog } from "../prisma/seeds/reseed-facade-catalog";

const prisma = new PrismaClient();

async function main() {
  console.log("Reseeding facade catalog…");
  const result = await reseedFacadeCatalog(prisma);
  console.log(`Done. Products: ${result.products.length}, materials: ${result.materials}`);
  for (const p of result.products) {
    console.log(`  - ${p.name} | photo=${p.photoUrl ?? "—"} | min=${p.minPrice}`);
  }
  if (result.unexpected.length) {
    console.warn("Unexpected products still present:", result.unexpected);
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
