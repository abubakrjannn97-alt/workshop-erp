import type { Dict, Locale } from "@core/shared/i18n/i18n";
import { getWorkshopDomain } from "@core/config/domain-config";
import { FACADE_DOMAIN_CONFIG } from "@/domains/facade/config";
import { FACADE_I18N_OVERRIDES } from "@/domains/facade/i18n-overrides";
import { FACADE_HELP_OVERRIDES } from "@/domains/facade/help-overrides";

/** Domain-specific translation overrides for the active WORKSHOP_DOMAIN preset. */
export function getDomainI18nOverrides(locale: Locale): Dict {
  if (getWorkshopDomain() === FACADE_DOMAIN_CONFIG.domain) {
    return FACADE_I18N_OVERRIDES[locale];
  }
  return {};
}

export function getDomainHelpOverrides(locale: Locale) {
  if (getWorkshopDomain() === FACADE_DOMAIN_CONFIG.domain) {
    return FACADE_HELP_OVERRIDES[locale];
  }
  return { tour: {}, faq: {} };
}
