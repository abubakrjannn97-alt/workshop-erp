import { cookies } from "next/headers";
import { DEFAULT_LOCALE, type Locale, LOCALES, createT, intlLocale, named } from "@/lib/i18n";

export { intlLocale };

export const LOCALE_COOKIE = "workshop_locale";

export async function getLocale(): Promise<Locale> {
  const jar = await cookies();
  const raw = jar.get(LOCALE_COOKIE)?.value;
  if (raw && (LOCALES as string[]).includes(raw)) return raw as Locale;
  return DEFAULT_LOCALE;
}

export async function getTranslator() {
  const locale = await getLocale();
  const t = createT(locale);
  return {
    locale,
    t,
    n: (prefix: string, code: string, fallback?: string) => named(locale, prefix, code, fallback),
  };
}
