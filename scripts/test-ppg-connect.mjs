import { PrismaClient } from "@prisma/client";
import { PrismaPostgresAdapter } from "@prisma/adapter-ppg";

const url = process.env.DATABASE_URL ?? "";
const direct = url.includes("@pooled.db.prisma.io")
  ? url.replace("@pooled.db.prisma.io", "@db.prisma.io")
  : url;

console.log("using ppg", direct.match(/@([^/:?]+)/)?.[1]);

const prisma = new PrismaClient({
  adapter: new PrismaPostgresAdapter({ connectionString: direct }),
});

try {
  const rows = await prisma.$queryRawUnsafe("SELECT 1 as ok");
  console.log("connected", rows);
} catch (e) {
  console.error("failed", e instanceof Error ? e.message : e);
  process.exit(1);
} finally {
  await prisma.$disconnect();
}
