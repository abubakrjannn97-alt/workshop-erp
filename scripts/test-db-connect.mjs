import { PrismaClient } from "@prisma/client";

const url = process.env.DATABASE_URL;
if (!url) {
  console.error("no DATABASE_URL");
  process.exit(1);
}
const host = url.match(/@([^/:?]+)/)?.[1] ?? "?";
console.log("host", host);

const prisma = new PrismaClient();
try {
  const rows = await prisma.$queryRawUnsafe("SELECT 1 as ok");
  console.log("connected", rows);
} catch (e) {
  console.error("failed", e instanceof Error ? e.message : e);
  process.exit(1);
} finally {
  await prisma.$disconnect();
}
