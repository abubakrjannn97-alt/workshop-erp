export const SETTING_KEYS = {
  companyName: "company_name",
  logoUrl: "logo_url",
  currencyCode: "currency_code",
  currencyName: "currency_name",
  timezone: "timezone",
  discountLimitPercent: "discount_limit_percent",
  opexReservePercent: "opex_reserve_percent",
} as const;

export type BusinessSettings = {
  companyName: string;
  logoUrl: string;
  currencyCode: string;
  currencyName: string;
  timezone: string;
  discountLimitPercent: string;
  opexReservePercent: string;
};

export const DEFAULT_SETTINGS: BusinessSettings = {
  companyName: "Производственный цех",
  logoUrl: "",
  currencyCode: "TJS",
  currencyName: "сомони",
  timezone: "Asia/Dushanbe",
  discountLimitPercent: "5",
  opexReservePercent: "0",
};
