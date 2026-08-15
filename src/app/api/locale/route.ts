import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { LOCALE_COOKIE } from "@/lib/locale-cookie";
import { LOCALES, type Locale } from "@/lib/i18n";

export async function POST(request: Request) {
  let body: { locale?: string };
  try {
    body = (await request.json()) as { locale?: string };
  } catch {
    return NextResponse.json({ ok: false }, { status: 400 });
  }

  const locale = String(body.locale ?? "");
  if (!(LOCALES as string[]).includes(locale)) {
    return NextResponse.json({ ok: false }, { status: 400 });
  }

  const jar = await cookies();
  jar.set(LOCALE_COOKIE, locale as Locale, {
    path: "/",
    maxAge: 60 * 60 * 24 * 365,
    sameSite: "lax",
    httpOnly: false,
  });

  return NextResponse.json({ ok: true });
}
