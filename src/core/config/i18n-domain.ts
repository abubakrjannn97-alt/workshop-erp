import type { Dict, Locale } from "@core/shared/i18n/i18n";
import { getWorkshopDomain } from "@core/config/workshop-domain";
import { DOMAIN_REGISTRY } from "@/domains/registry";

/** Domain-specific translation overrides for the active WORKSHOP_DOMAIN preset. */
export function getDomainI18nOverrides(locale: Locale): Dict {
  return DOMAIN_REGISTRY[getWorkshopDomain()]?.i18n[locale] ?? {};
}

export function getDomainHelpOverrides(locale: Locale) {
  const help = DOMAIN_REGISTRY[getWorkshopDomain()]?.help[locale];
  return {
    tour: help?.tour ?? {},
    faq: help?.faq ?? {},
  };
}
