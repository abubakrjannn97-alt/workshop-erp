import type { Dict, Locale } from "@core/shared/i18n/i18n";
import { getWorkshopDomain } from "@core/config/domain-config";
import { FACADE_DOMAIN_CONFIG } from "@/domains/facade/config";
import { FACADE_I18N_OVERRIDES } from "@/domains/facade/i18n-overrides";
import { FACADE_HELP_OVERRIDES } from "@/domains/facade/help-overrides";

const DOMAIN_I18N_OVERRIDES: Record<string, Record<Locale, Dict>> = {
  [FACADE_DOMAIN_CONFIG.domain]: FACADE_I18N_OVERRIDES,
};

const DOMAIN_HELP_OVERRIDES: Record<
  string,
  Record<Locale, { tour: Record<string, string>; faq: Record<string, string> }>
> = {
  [FACADE_DOMAIN_CONFIG.domain]: FACADE_HELP_OVERRIDES,
};

/** Domain-specific translation overrides for the active WORKSHOP_DOMAIN preset. */
export function getDomainI18nOverrides(locale: Locale): Dict {
  return DOMAIN_I18N_OVERRIDES[getWorkshopDomain()]?.[locale] ?? {};
}

export function getDomainHelpOverrides(locale: Locale) {
  return DOMAIN_HELP_OVERRIDES[getWorkshopDomain()]?.[locale] ?? { tour: {}, faq: {} };
}
