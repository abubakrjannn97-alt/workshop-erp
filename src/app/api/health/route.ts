import { prisma } from "@core/infrastructure/prisma";
import { logger } from "@core/infrastructure/logger";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET() {
  const secretLen = process.env.AUTH_SECRET?.trim().length ?? 0;
  const authInfo = {
    secretConfigured: secretLen >= 32,
    secretLen,
    authUrl: process.env.AUTH_URL ?? null,
  };
  try {
    await prisma.$queryRawUnsafe("SELECT 1");
    return NextResponse.json({ status: "ok", auth: authInfo }, { status: 200 });
  } catch (err) {
    logger.error({ err }, "health check failed");
    return NextResponse.json(
      {
        status: "error",
        detail: "db unreachable",
        auth: authInfo,
        dbHost: process.env.DATABASE_URL?.match(/@([^/:?]+)/)?.[1] ?? null,
      },
      { status: 503 },
    );
  }
}
