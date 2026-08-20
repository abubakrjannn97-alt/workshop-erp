import type { Locale } from "@core/shared/i18n/i18n";

type HelpTextOverrides = {
  tour?: Partial<Record<string, string>>;
  faq?: Partial<Record<string, string>>;
};

/** Bakery help copy — kg / piece, no facade tile language. */
export const BAKERY_HELP_OVERRIDES: Record<Locale, HelpTextOverrides> = {
  ru: {
    tour: {
      "products:nav-products":
        "Изделия, которые продаёте, и рецепт сырья на единицу (обычно 1 кг).",
    },
    faq: {
      product:
        "«Продукция» → создать → карточка → рецепт: сырьё на 1 кг. Без рецепта себестоимость не считается.",
    },
  },
  tj: {
    tour: {
      "products:nav-products": "Молҳое, ки мефурӯшед, ва рецепти ашё ба 1 кг.",
    },
    faq: {
      product: "«Маҳсулот» → сохтан → корт → рецепт ба 1 кг.",
    },
  },
};
