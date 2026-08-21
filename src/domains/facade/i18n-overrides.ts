import type { Dict, Locale } from "@core/shared/i18n/i18n";

/**
 * Facade Production UI copy — м² / плитка / камень.
 * Layered on generic core i18n; never imported by Core business logic.
 */
export const FACADE_I18N_OVERRIDES: Record<Locale, Dict> = {
  ru: {
    "app.shop": "Фасадный цех",
    "home.subtitle": "Доходы, расходы и выпуск фасадной плитки / камня за этот месяц",
    "home.made": "Сделано, м²",
    "home.scrap": "Брак, м²",
    "home.kpi.producedToday": "Произведено сегодня, м²",
    "home.kpi.scrapToday": "Брак",
    "home.kpi.scrapTodayHint": "Списано сегодня, м²",
    "home.kpi.scrapUnit": "м²",
    "home.kpi.noScrapToday": "Брака сегодня нет",
    "home.kpi.finishedGoods": "Остаток плитки",
    "home.kpi.onStock": "Готово к продаже",
    "home.kpi.fgUnit": "шт",
    "home.kpi.fgHint": "На складе ГП",
    "home.greetCalm": "Всё спокойно. Фасадное производство под контролем.",
    "home.actionAddProduct": "Добавить изделие (плитка / камень)",

    "products.hint":
      "Цена за м² хранится с периодом действия. Себестоимость — из рецептуры на 1 м², не вручную.",
    "products.categoryDefault": "Фасад",
    "products.recipeBase": "База рецептуры (обычно 1 м²)",
    "products.recipeBaseShort": "Рецепт на, м²",
    "products.outputBase": "Выход с базы (напр. 10 плиток / 1 м²)",
    "products.outputBaseShort": "Плиток с 1 м²",
    "products.tipRecipe": "«Рецепт на» — обычно 1 м²: состав сырья считается на квадратный метр продажи.",
    "products.tipOutput": "«Выходит штук» — сколько плиток (или блоков камня) получается с 1 м² рецепта.",
    "products.tipUnits": "Ед. продажи — м². Ед. ГП — штуки плитки / блоков на складе.",
    "products.phRecipeBase": "обычно 1 м²",
    "products.phOutput": "напр. 10 плиток",
    "products.saleUnit": "Ед. продажи (м²)",
    "products.stepRecipeLead":
      "Добавьте сырьё и количество на 1 м². Цена сырья — из закупки; расход посчитается сам.",
    "products.matCostHint":
      "Себестоимость сырья на 1 м² из рецептуры и закупочных цен. Рабочие (с/м²), комиссия и OPEX — отдельно.",

    "orders.payrollNote":
      "Зарплата начисляется по годным м² партии, комиссия — с фактической оплаты клиента.",
    "orders.materialsEmpty": "Материалов нет: у изделия не задан рецепт на 1 м²",

    "prod.hint":
      "Задание создаётся при подтверждении заказа. Партии в м²: факт, брак и выпуск плитки/камня на склад ГП.",
    "prod.batchesHint": "Открытые партии. Закройте факт (годные м²) и брак в карточке задания.",
    "prod.scrapHint": "Брак за текущий месяц (м²).",
    "prod.actualGood": "Фактически произведено годных, м²",
    "prod.goodQty": "Годных, м²",
    "prod.stageDesc.MIX": "Подготовка сырья: цемент, песок, пигмент, клей",
    "prod.stageDesc.FORM": "Заливка в формы и виброуплотнение плитки / камня",
    "prod.stageDesc.DRY": "Сушка и набор прочности фасадных изделий",
    "prod.stageDesc.PACK": "Контроль качества и перемещение на склад ГП (шт.)",

    "me.closeHint": "Укажите сколько м² сделали и сколько брака — затем «Завершить».",

    "emp.hint":
      "Здесь задают, сколько платить рабочему за м² и какой % получает продавец с оплат клиента.",
    "emp.productionRate": "Сколько сомони за 1 м² годной продукции",
    "emp.laborTitle": "Оплата рабочим за м²",
    "emp.laborHint": "Сколько сомони платим за 1 м² годной плитки / камня. Брак не оплачивается.",
    "emp.currentRate": "Сейчас платим {n} с за 1 м²",
    "emp.goodOutput": "Годных м²",

    "an.scrapHint":
      "Это количество в м², а не деньги. Кто списал брак и по какому изделию (плитка / камень).",

    "set.unitsHint":
      "Для фасадного цеха: м² — продажа, шт — плитка на складе, кг/ведро — сырьё.",
  },
  tj: {
    "app.shop": "Цехи фасад",
    "home.subtitle": "Даромад, хароҷот ва барориши плитка / санги фасад дар ин моҳ",
    "home.made": "Истеҳсол, м²",
    "home.scrap": "Нуқсон, м²",
    "home.kpi.producedToday": "Имрӯз истеҳсол, м²",
    "home.kpi.scrapToday": "Нуқсон",
    "home.kpi.scrapTodayHint": "Имрӯз навишта шуд, м²",
    "home.kpi.scrapUnit": "м²",
    "home.kpi.noScrapToday": "Имрӯз нуқсон нест",
    "home.kpi.finishedGoods": "Боқимондаи плитка",
    "home.kpi.onStock": "Омода ба фурӯш",
    "home.kpi.fgUnit": "дона",
    "home.kpi.fgHint": "Дар анбори ГП",
    "home.greetCalm": "Ором. Истеҳсоли фасад зери назорат аст.",
    "home.actionAddProduct": "Маҳсулот илова (плитка / санг)",

    "products.hint":
      "Нархи м² бо мӯҳлат. Арзиши асл аз рецепт барои 1 м² ҳисоб мешавад.",
    "products.categoryDefault": "Фасад",
    "products.recipeBase": "Базаи рецепт (одатан 1 м²)",
    "products.recipeBaseShort": "Рецепт барои, м²",
    "products.outputBase": "Баромад аз база (мас. 10 плитка / 1 м²)",
    "products.outputBaseShort": "Плитка аз 1 м²",
    "products.tipRecipe": "«Рецепт барои» — одатан 1 м²: ашё барои як метри мураббаъ.",
    "products.tipOutput": "«Мебарояд дона» — аз 1 м² рецепт чанд плитка ё блок мебарояд.",
    "products.tipUnits": "Воҳиди фурӯш — м². Воҳиди ГП — донаи плитка / блок дар анбор.",
    "products.phRecipeBase": "одатан 1 м²",
    "products.phOutput": "мас. 10 плитка",
    "products.saleUnit": "Воҳиди фурӯш (м²)",
    "products.stepRecipeLead":
      "Ашё ва миқдор барои 1 м² илова кунед. Нарх аз харид — хароҷот худ ҳисоб мешавад.",
    "products.matCostHint":
      "Арзиши ашё барои 1 м² аз рецепт ва нархи харид. Маоши коргар (с/м²), комиссия ва OPEX алоҳида.",

    "orders.payrollNote": "Маош аз м²-и хуб, комиссия аз пардохти воқеии мизоҷ.",
    "orders.materialsEmpty": "Ашё нест: барои маҳсулот рецепт барои 1 м² гузошта нашудааст",

    "prod.hint":
      "Вазифа пас аз тасдиқи фармоиш. Партияҳо бо м²: факт, нуқсон ва барориш ба анбори ГП.",
    "prod.batchesHint": "Партияҳои кушода. Факт (м²-и хуб) ва нуқсонро дар корт бандед.",
    "prod.scrapHint": "Нуқсони моҳ (м²).",
    "prod.actualGood": "Истеҳсоли воқеии хуб, м²",
    "prod.goodQty": "Хуб, м²",
    "prod.stageDesc.MIX": "Омодаи ашё: семент, қум, ранг, часпак",
    "prod.stageDesc.FORM": "Рехтан ба қолиб ва ларзишдиҳӣ",
    "prod.stageDesc.DRY": "Хушкшавӣ ва мустаҳкамшавии маҳсулоти фасад",
    "prod.stageDesc.PACK": "Назорати сифат ва интиқол ба анбори ГП (дона)",

    "me.closeHint": "Чанд м² кардед ва чанд нуқсон — баъд «Анҷом».",

    "emp.hint":
      "Ин ҷо: коргар барои 1 м² чӣ қадар мегирад ва фурӯшанда аз пардохти мизоҷ чанд %.",
    "emp.productionRate": "Чанд сомонӣ барои 1 м² маҳсулоти хуб",
    "emp.laborTitle": "Маоши коргар барои м²",
    "emp.laborHint": "Барои 1 м² плитка / санги хуб чанд сомонӣ. Нуқсон пардохт намешавад.",
    "emp.currentRate": "Ҳоло {n} с барои 1 м²",
    "emp.goodOutput": "м²-и хуб",

    "an.scrapHint":
      "Ин миқдор бо м² аст, на пул. Кӣ нуқсон навишт ва аз кадом маҳсулот (плитка / санг).",

    "set.unitsHint":
      "Барои цехи фасад: м² — фурӯш, дона — плитка дар анбор, кг/сатил — ашё.",
  },
};
