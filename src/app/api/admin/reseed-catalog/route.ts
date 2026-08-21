import { NextResponse } from "next/server";
import { prisma } from "@core/infrastructure/prisma";
import { reseedFacadeCatalog } from "../../../../../prisma/seeds/reseed-facade-catalog";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

/**
 * One-shot: replace product/material catalog with current facade seed + photos.
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

  try {
    const result = await reseedFacadeCatalog(prisma);
    return NextResponse.json({ ok: true, ...result });
  } catch (err) {
    return NextResponse.json(
      { error: "reseed_failed", detail: err instanceof Error ? err.message : String(err) },
      { status: 500 },
    );
  }
}
