import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const REAL_NAMES = [
  "Фарҳод Раҳимов",
  "Дилшод Каримов",
  "Малика Назарова",
  "Рустам Шарипов",
  "Зарина Мирзоева",
  "Азизҷон Юсупов",
  "Нигора Саидова",
  "Ҷамшед Холов",
  "Парвина Исмоилова",
  "Бахтиёр Набиев",
  "Гулрухсор Азизова",
  "Саидмурод Раҷабов",
];

function isPlaceholder(name: string) {
  return /smoke|смоук|тест|test клиент|клиент\s*\d+/i.test(name);
}

async function main() {
  const customers = await prisma.customer.findMany({
    orderBy: { createdAt: "asc" },
    select: { id: true, name: true },
  });

  const used = new Set(customers.filter((c) => !isPlaceholder(c.name)).map((c) => c.name));
  let i = 0;
  let updated = 0;

  for (const c of customers) {
    if (!isPlaceholder(c.name)) continue;
    let next = REAL_NAMES[i % REAL_NAMES.length];
    while (used.has(next)) {
      i += 1;
      next = `${REAL_NAMES[i % REAL_NAMES.length]}`;
      if (i >= REAL_NAMES.length) next = `${REAL_NAMES[i % REAL_NAMES.length]} ${Math.floor(i / REAL_NAMES.length) + 1}`;
    }
    used.add(next);
    i += 1;
    await prisma.customer.update({ where: { id: c.id }, data: { name: next } });
    console.log(`${c.name} → ${next}`);
    updated += 1;
  }

  const leads = await prisma.lead.findMany({ select: { id: true, name: true } });
  for (const l of leads) {
    if (!isPlaceholder(l.name)) continue;
    const next = REAL_NAMES[i % REAL_NAMES.length];
    i += 1;
    await prisma.lead.update({ where: { id: l.id }, data: { name: next } });
    console.log(`lead ${l.name} → ${next}`);
    updated += 1;
  }

  console.log(`updated ${updated}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
