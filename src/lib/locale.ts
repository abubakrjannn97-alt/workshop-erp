import { unstable_noStore as noStore } from "next/cache";
import { cookies } from "next/headers";
import { DEFAULT_LOCALE, type Locale, LOCALES, createT, intlLocale, named } from "@/lib/i18n";
import { LOCALE_COOKIE } from "@/lib/locale-cookie";

export { intlLocale, LOCALE_COOKIE };

export async function getLocale(): Promise<Locale> {
  noStore();
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
