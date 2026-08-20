import { PrismaClient } from "@prisma/client";

async function main() {
  const url = process.argv[2] ?? process.env.DATABASE_URL;
  if (!url) {
    console.error("No database URL");
    process.exit(1);
  }

  const prisma = new PrismaClient({ datasources: { db: { url } } });
  const demoEmails = [
    "owner@workshop.local",
    "director@workshop.local",
    "sales@workshop.local",
    "production@workshop.local",
    "worker@workshop.local",
    "warehouse@workshop.local",
    "accountant@workshop.local",
  ];

  const result = {
    database: new URL(url).pathname.replace(/^\//, "").split("?")[0],
    seedOpeningStock: await prisma.stockMovement.count({
      where: { idempotencyKey: { startsWith: "seed-opening-" } },
    }),
    orders: await prisma.order.count(),
    customers: await prisma.customer.count(),
    payments: await prisma.payment.count(),
    productionBatches: await prisma.productionBatch.count(),
    ledgerEntries: await prisma.ledgerEntry.count(),
    stockOnHand: await prisma.stockItem.count({ where: { qtyOnHand: { gt: 0 } } }),
    users: await prisma.user.count(),
    demoUsers: await prisma.user.findMany({
      where: { email: { in: demoEmails } },
      select: { email: true, role: { select: { code: true } } },
    }),
    materials: await prisma.material.count(),
    products: await prisma.product.count(),
  };

  console.log(JSON.stringify(result, null, 2));
  await prisma.$disconnect();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
