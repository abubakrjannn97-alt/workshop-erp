import type { Dict, Locale } from "@core/shared/i18n/i18n";

/** Bakery UI terminology — kg / piece, no facade m². */
export const BAKERY_I18N_OVERRIDES: Record<Locale, Dict> = {
  ru: {
    "products.recipeBase": "База рецептуры (обычно 1 кг)",
    "products.outputBase": "Выход с базы (напр. 1 изделие / 1 кг теста)",
    "products.categoryDefault": "Выпечка",
    "orders.payrollNote": "Зарплата начисляется по годным штукам партии, комиссия — с фактической оплаты.",
    "emp.hint": "Здесь задают, сколько платить рабочему за штуку и какой % получает продавец с оплат клиента.",
    "emp.productionRate": "Сколько сомони за 1 шт. годной продукции",
    "emp.laborTitle": "Оплата рабочим за штуку",
    "emp.laborHint": "Сколько сомони платим за 1 годное изделие. Брак не оплачивается.",
    "emp.currentRate": "Сейчас платим {n} с за 1 шт.",
    "emp.goodOutput": "Годных шт.",
    "an.scrapHint": "Это количество (обычно штуки), а не деньги. Кто списал брак и по какому изделию.",
  },
  tj: {
    "products.recipeBase": "Базаи рецепт (одатан 1 кг)",
    "products.outputBase": "Баромад аз база (мас. 1 маҳсулот / 1 кг хамир)",
    "products.categoryDefault": "Выпечка",
    "orders.payrollNote": "Маош аз донаҳои хуб, комиссия аз пардохти воқеӣ.",
    "emp.hint": "Ин ҷо муайян мекунанд: коргар барои 1 дона чӣ қадар мегирад ва фурӯшанда аз пардохти мизоҷ чанд %.",
    "emp.productionRate": "Чанд сомонӣ барои 1 дона маҳсулоти хуб",
    "emp.laborTitle": "Маоши коргар барои дона",
    "emp.laborHint": "Барои 1 маҳсулоти хуб чанд сомонӣ медиҳем. Нуқсон пардохт намешавад.",
    "emp.currentRate": "Ҳоло {n} с барои 1 дона",
    "emp.goodOutput": "донаҳои хуб",
    "an.scrapHint": "Ин миқдор аст (одат. дона), на пул. Кӣ нуқсон навишт ва аз кадом маҳсулот.",
  },
};
