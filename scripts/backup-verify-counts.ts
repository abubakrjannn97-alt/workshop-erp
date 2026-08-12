import { writeFileSync } from "fs";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function counts() {
  return {
    orders: await prisma.order.count(),
    payments: await prisma.payment.count(),
    stock: await prisma.stockItem.count(),
    materials: await prisma.material.count(),
    ledger: await prisma.ledgerEntry.count(),
  };
}

async function main() {
  const before = await counts();
  writeFileSync("scripts/backup-verify-before.json", JSON.stringify(before, null, 2));
  console.log("BEFORE", before);
  await prisma.$disconnect();
}

main().catch(async (e) => {
  console.error(e);
  await prisma.$disconnect();
  process.exit(1);
});
