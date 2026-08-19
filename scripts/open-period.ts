import { prisma } from "../src/core/infrastructure/prisma";

async function main() {
  const year = Number(process.argv[2] ?? new Date().getFullYear());
  const month = Number(process.argv[3] ?? new Date().getMonth() + 1);

  const row = await prisma.accountingPeriod.upsert({
    where: { year_month: { year, month } },
    update: { status: "OPEN", closedById: null, closedAt: null },
    create: { year, month, status: "OPEN" },
  });

  console.log(`Period ${row.month}.${row.year} -> ${row.status}`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
