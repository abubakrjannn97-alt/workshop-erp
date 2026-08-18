import type { Dict, Locale } from "@/lib/i18n";

/** Facade-specific UI terminology layered on top of core i18n. */
export const FACADE_I18N_OVERRIDES: Record<Locale, Dict> = {
  ru: {
    "products.recipeBase": "База рецептуры (обычно 1 м²)",
    "products.outputBase": "Выход с базы (напр. 10 плиток / 1 м²)",
    "products.categoryDefault": "Фасад",
    "orders.payrollNote": "Зарплата начисляется по годным м² партии, комиссия — с фактической оплаты.",
    "emp.hint": "Здесь задают, сколько платить рабочему за м² и какой % получает продавец с оплат клиента.",
    "emp.rateM2": "Сколько сомони за 1 м² годной продукции",
    "emp.laborTitle": "Оплата рабочим за м²",
    "emp.laborHint": "Сколько сомони платим за 1 м² годной плитки. Брак не оплачивается.",
    "emp.currentRate": "Сейчас платим {n} с за 1 м²",
    "emp.goodM2": "Годных м²",
    "an.scrapHint": "Это количество (обычно м²), а не деньги. Кто списал брак и по какому изделию.",
  },
  tj: {
    "products.recipeBase": "Базаи рецепт (одатан 1 м²)",
    "products.outputBase": "Баромад аз база (мас. 10 плитка / 1 м²)",
    "products.categoryDefault": "Фасад",
    "orders.payrollNote": "Маош аз м²-и хуб, комиссия аз пардохти воқеӣ.",
    "emp.hint": "Ин ҷо муайян мекунанд: коргар барои 1 м² чӣ қадар мегирад ва фурӯшанда аз пардохти мизоҷ чанд %.",
    "emp.rateM2": "Чанд сомонӣ барои 1 м² маҳсулоти хуб",
    "emp.laborTitle": "Маоши коргар барои м²",
    "emp.laborHint": "Барои 1 м² плиткаи хуб чанд сомонӣ медиҳем. Нуқсон пардохт намешавад.",
    "emp.currentRate": "Ҳоло {n} с барои 1 м²",
    "emp.goodM2": "м²-и хуб",
    "an.scrapHint": "Ин миқдор аст (одат. м²), на пул. Кӣ нуқсон навишт ва аз кадом маҳсулот.",
  },
};
