"use server";

import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { LOCALE_COOKIE } from "@core/shared/locale-cookie";
import { LOCALES, type Locale } from "@/lib/i18n";

export async function setLocaleAction(formData: FormData) {
  const locale = String(formData.get("locale") ?? "");
  if (!(LOCALES as string[]).includes(locale)) return;
  const jar = await cookies();
  jar.set(LOCALE_COOKIE, locale as Locale, {
    path: "/",
    maxAge: 60 * 60 * 24 * 365,
    sameSite: "lax",
    httpOnly: false,
  });
  revalidatePath("/", "layout");
}
