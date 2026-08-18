import type { Locale } from "@core/shared/i18n/i18n";

type HelpTextOverrides = {
  tour?: Partial<Record<string, string>>;
  faq?: Partial<Record<string, string>>;
};

/** Facade-specific help copy overrides keyed by page/target or FAQ id. */
export const FACADE_HELP_OVERRIDES: Record<Locale, HelpTextOverrides> = {
  ru: {
    tour: {
      "products:nav-products":
        "Изделия, которые продаёте, и рецепт сырья на единицу (обычно 1 м²).",
    },
    faq: {
      product:
        "«Продукция» → создать → карточка → рецепт: сырьё на 1 м². Без рецепта себестоимость не считается.",
    },
  },
  tj: {
    tour: {
      "products:nav-products": "Молҳое, ки мефурӯшед, ва рецепти ашё ба 1 м².",
    },
    faq: {
      product: "«Маҳсулот» → сохтан → корт → рецепт ба 1 м².",
    },
  },
};
