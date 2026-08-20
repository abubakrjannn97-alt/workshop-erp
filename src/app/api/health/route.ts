import { prisma } from "@core/infrastructure/prisma";
import { logger } from "@core/infrastructure/logger";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    await prisma.$queryRawUnsafe("SELECT 1");
    return NextResponse.json({ status: "ok" }, { status: 200 });
  } catch (err) {
    logger.error({ err }, "health check failed");
    return NextResponse.json({ status: "error", detail: "db unreachable" }, { status: 503 });
  }
}
