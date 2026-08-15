import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ items: [] }, { status: 401 });
  }
  const items = await prisma.notification.findMany({
    where: { userId: session.user.id, readAt: null },
    orderBy: { createdAt: "desc" },
    take: 8,
    select: { id: true, title: true, body: true },
  });
  return NextResponse.json({ items });
}
