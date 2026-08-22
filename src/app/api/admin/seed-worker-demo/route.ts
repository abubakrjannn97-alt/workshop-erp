import { NextResponse } from "next/server";
import { prisma } from "@core/infrastructure/prisma";
import { seedWorkerTabDemo } from "../../../../../prisma/seeds/demo/worker-demo";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

/** One-shot: demo accruals for worker «Мои итоги». Header: x-wipe-token */
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
    await seedWorkerTabDemo(prisma);
    return NextResponse.json({ ok: true });
  } catch (err) {
    return NextResponse.json(
      { error: "seed_failed", detail: err instanceof Error ? err.message : String(err) },
      { status: 500 },
    );
  }
}
