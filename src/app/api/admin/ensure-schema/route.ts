import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const PATCHES = [
  `ALTER TABLE "products" ADD COLUMN IF NOT EXISTS "minStock" DECIMAL(18,6) NOT NULL DEFAULT 0`,
  `ALTER TABLE "products" ADD COLUMN IF NOT EXISTS "maxStock" DECIMAL(18,6) NOT NULL DEFAULT 0`,
  `ALTER TABLE "products" ADD COLUMN IF NOT EXISTS "laborRate" DECIMAL(18,4) NOT NULL DEFAULT 0`,
  `UPDATE "products" SET "laborRate" = 22 WHERE "laborRate" = 0`,
];

/** One-shot schema patch when migrate history is missing. Header: x-wipe-token */
export async function POST(req: Request) {
  const expected = process.env.WIPE_TOKEN?.trim();
  if (!expected) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }
  const token = req.headers.get("x-wipe-token")?.trim();
  if (!token || token !== expected) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const dbUrl = process.env.DATABASE_URL?.trim();
  if (!dbUrl) {
    return NextResponse.json({ error: "no_database_url" }, { status: 503 });
  }

  process.env.DIRECT_URL = dbUrl;
  const { PrismaClient } = await import("@prisma/client");
  const prisma = new PrismaClient({ datasources: { db: { url: dbUrl } } });

  try {
    for (const sql of PATCHES) {
      await prisma.$executeRawUnsafe(sql);
    }
    const sample = await prisma.product.findFirst({
      select: { id: true, laborRate: true, minStock: true, maxStock: true },
    });
    return NextResponse.json({ ok: true, sample });
  } catch (err) {
    return NextResponse.json(
      { error: "patch_failed", detail: err instanceof Error ? err.message : String(err) },
      { status: 500 },
    );
  } finally {
    await prisma.$disconnect();
  }
}
