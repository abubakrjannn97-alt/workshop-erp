import { NextResponse } from "next/server";
import { prisma } from "@core/infrastructure/prisma";
import { seedWorkshop } from "../../../../../prisma/seeds/orchestrator";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

/**
 * One-shot: seed empty production DB (no demo customers/employees).
 * Schema is applied at build via `prisma db push`.
 * Header: x-wipe-token: <WIPE_TOKEN>
 */
export async function POST(req: Request) {
  const expected = process.env.WIPE_TOKEN?.trim();
  if (!expected) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }
  const token = req.headers.get("x-wipe-token")?.trim();
  if (!token || token !== expected) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  try {
    await prisma.$queryRawUnsafe("SELECT 1");
  } catch (err) {
    return NextResponse.json(
      { error: "db_unreachable", detail: err instanceof Error ? err.message : String(err) },
      { status: 503 },
    );
  }

  process.env.SEED_DEMO = "0";
  if (!process.env.OWNER_PASSWORD) process.env.OWNER_PASSWORD = "1";
  if (!process.env.OWNER_PHONE) process.env.OWNER_PHONE = "900000001";

  try {
    const result = await seedWorkshop(prisma);
    const usersAfter = await prisma.user.count();
    const customers = await prisma.customer.count();
    return NextResponse.json({
      ok: true,
      domainId: result.domainId,
      demoSeeded: result.demoSeeded,
      usersAfter,
      customers,
    });
  } catch (err) {
    return NextResponse.json(
      { error: "seed_failed", detail: err instanceof Error ? err.message : String(err) },
      { status: 500 },
    );
  }
}
