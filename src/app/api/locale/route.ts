import { NextResponse } from "next/server";
import { LOCALE_COOKIE } from "@core/shared/locale-cookie";
import { LOCALES, type Locale } from "@core/shared/i18n/i18n";

export const dynamic = "force-dynamic";

function cookieOptions() {
  return {
    path: "/",
    maxAge: 60 * 60 * 24 * 365,
    sameSite: "lax" as const,
    httpOnly: false,
    secure: process.env.NODE_ENV === "production",
  };
}

function safeRedirect(raw: string | null) {
  if (!raw || !raw.startsWith("/") || raw.startsWith("//")) return "/";
  return raw;
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const locale = String(url.searchParams.get("locale") ?? "");
  const redirectTo = safeRedirect(url.searchParams.get("redirect"));

  if (!(LOCALES as string[]).includes(locale)) {
    return NextResponse.redirect(new URL(redirectTo, request.url));
  }

  const res = NextResponse.redirect(new URL(redirectTo, request.url));
  res.cookies.set(LOCALE_COOKIE, locale as Locale, cookieOptions());
  return res;
}

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

  const res = NextResponse.json({ ok: true });
  res.cookies.set(LOCALE_COOKIE, locale as Locale, cookieOptions());
  return res;
}
