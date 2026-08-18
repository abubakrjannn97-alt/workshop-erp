import type { Locale } from "@/lib/i18n";
import { getDomainHelpOverrides } from "@/lib/i18n-domain";

export type HelpPageId =
  | "home"
  | "products"
  | "sales"
  | "crm"
  | "orders"
  | "production"
  | "warehouse"
  | "purchasing"
  | "finance"
  | "employees"
  | "analytics"
  | "settings"
  | "notifications"
  | "search";

export const HINTS_OFF_KEY = "workshop_hints_off_v3";
export const HINT_HIDDEN_KEY = "workshop_hint_hidden_v3";
export const HELP_REPLAY = "workshop:help-replay";
export const HELP_RESTORE = "workshop:help-restore";

export function pageIdFromPath(path: string): HelpPageId | null {
  if (path === "/") return "home";
  if (path.startsWith("/products")) return "products";
  if (path.startsWith("/sales")) return "sales";
  if (path.startsWith("/crm")) return "crm";
  if (path.startsWith("/orders")) return "orders";
  if (path.startsWith("/production")) return "production";
  if (path.startsWith("/warehouse") || path.startsWith("/materials")) return "warehouse";
  if (path.startsWith("/purchasing")) return "purchasing";
  if (path.startsWith("/finance")) return "finance";
  if (path.startsWith("/employees")) return "employees";
  if (path.startsWith("/analytics")) return "analytics";
  if (path.startsWith("/settings")) return "settings";
  if (path.startsWith("/notifications")) return "notifications";
  if (path.startsWith("/search")) return "search";
  return null;
}

export type TourStep = {
  targets: string[];
  title: string;
  text: string;
  intro?: boolean;
};

const ruTour: Record<HelpPageId, TourStep[]> = {
  home: [
    {
      targets: [],
      intro: true,
      title: "Добро пожаловать",
      text: "Цех уже в работе. Сейчас покажем, где доходы, что происходит сегодня и что сделать первым. «Пропустить» — скрыть этот экран. «Больше не показывать» — отключить подсказки на этом устройстве.",
    },
    {
      targets: ["home-income"],
      title: "Ваши доходы",
      text: "Выручка за месяц, сколько уже получили, долги клиентов и свободная прибыль. Стрелка — сравнение с прошлым месяцем.",
    },
    {
      targets: ["home-orders"],
      title: "Что сейчас в цехе",
      text: "Последние заказы и их статус: в производстве, готов, выдан клиенту. Это живая очередь цеха.",
    },
    {
      targets: ["home-attention"],
      title: "Что сделать сейчас",
      text: "Долги, просрочки и сырьё ниже минимума. Начните с красных пунктов — они требуют действия сегодня.",
    },
    {
      targets: ["home-shortcuts"],
      title: "Быстрые действия",
      text: "Новый заказ, клиенты, изделия, производство — отсюда, без поиска по меню.",
    },
    {
      targets: ["nav-orders"],
      title: "Заказы",
      text: "Все заявки. Создайте заказ, подтвердите — он уйдёт в производство.",
    },
    {
      targets: ["nav-production"],
      title: "Производство",
      text: "Задания цеха по подтверждённым заказам: партии, факт, брак.",
    },
    {
      targets: ["nav-warehouse"],
      title: "Склад",
      text: "Сырьё и готовая продукция. Если остаток красный — пора закупать.",
    },
    {
      targets: ["tour-lang"],
      title: "Язык",
      text: "RU или TJ. После нажатия страница обновится. Имена клиентов и товаров не меняются.",
    },
  ],
  products: [
    {
      targets: ["nav-products"],
      title: "Продукция",
      text: "Изделия, которые продаёте, и рецепт сырья на единицу продажи.",
    },
    {
      targets: ["products-new"],
      title: "Новое изделие",
      text: "Создайте изделие: имя, единицы, цена. Потом откройте карточку и заполните рецепт.",
    },
    {
      targets: ["products-list"],
      title: "Список",
      text: "Цена продажи и себестоимость сырья. Если рецепта нет — себестоимость неполная.",
    },
  ],
  sales: [
    {
      targets: ["nav-sales"],
      title: "Продажи",
      text: "Деньги и долги: кто сколько должен, какие заказы просрочены.",
    },
    {
      targets: ["sales-new", "orders-new"],
      title: "Новый заказ",
      text: "Заявка создаётся здесь или в «Заказах». Оплату вносят уже в карточке заказа.",
    },
    {
      targets: ["sales-debts"],
      title: "Долги клиентов",
      text: "Пока заказ не оплачен полностью, он остаётся в этом списке.",
    },
  ],
  crm: [
    {
      targets: ["nav-crm"],
      title: "Клиенты",
      text: "Карточки клиентов и воронка лидов — потенциальных заказов.",
    },
    {
      targets: ["crm-new"],
      title: "Новый клиент",
      text: "ФИО или фирма, телефон — сохранить. Потом его можно выбрать в заказе.",
    },
    {
      targets: ["crm-lead"],
      title: "Новый лид",
      text: "Если человек ещё думает. Попадёт в воронку, заказ можно создать позже.",
    },
    {
      targets: ["crm-pipeline"],
      title: "Воронка",
      text: "Колонки — этапы. Передвигайте карточку. При отказе укажите причину.",
    },
  ],
  orders: [
    {
      targets: ["nav-orders"],
      title: "Заказы",
      text: "Путь заявки: подтвердить → производство → склад → выдать клиенту.",
    },
    {
      targets: ["orders-new"],
      title: "Создать заказ",
      text: "Клиент, изделие, количество, цена. Скидку — только в лимите из настроек.",
    },
    {
      targets: ["orders-search"],
      title: "Поиск",
      text: "Номер заказа или имя клиента. Статус — чтобы отфильтровать очередь.",
    },
    {
      targets: ["orders-list"],
      title: "Список",
      text: "Откройте строку: оплата, печать, смена статуса. Тёмная кнопка — главное действие.",
    },
  ],
  production: [
    {
      targets: ["nav-production"],
      title: "Производство",
      text: "Задания цеха. Появляются после подтверждения заказа.",
    },
    {
      targets: ["production-list"],
      title: "Задания",
      text: "Откройте строку: партии, факт, брак. Когда выпуск закрыт — готовое на склад ГП.",
    },
  ],
  warehouse: [
    {
      targets: ["nav-warehouse"],
      title: "Склад",
      text: "Сырьё и остатки. Красное / ниже минимума — пора закупать.",
    },
    {
      targets: ["warehouse-stock"],
      title: "Остатки",
      text: "На руках, резерв, доступно. Резерв уже занят заказами — его не списывают вручную.",
    },
    {
      targets: ["warehouse-in"],
      title: "Приход",
      text: "Начальный остаток или приём, если товар уже в цехе. Обычный путь — через Закупки.",
    },
    {
      targets: ["warehouse-out"],
      title: "Списание",
      text: "Только если материал реально ушёл не в заказ. Красная кнопка — необратимо.",
    },
  ],
  purchasing: [
    {
      targets: ["nav-purchasing"],
      title: "Закупки",
      text: "Поставщики и заказы сырья. Сюда же — оплата поставщику.",
    },
    {
      targets: ["po-suppliers"],
      title: "Поставщики",
      text: "Сначала карточка поставщика. Без неё заказ на закупку не создать.",
    },
    {
      targets: ["po-new"],
      title: "Заказ поставщику",
      text: "Что и сколько. Когда привезли — примите на склад в карточке закупки.",
    },
  ],
  finance: [
    {
      targets: ["nav-finance"],
      title: "Финансы",
      text: "Касса и банк — живые деньги. Фонды — куда они распределены.",
    },
    {
      targets: ["fin-money"],
      title: "Деньги",
      text: "На руках, по фондам, долг поставщикам. Это не склад — только деньги.",
    },
    {
      targets: ["fin-shift"],
      title: "Смена кассы",
      text: "Открывают утром, закрывают вечером. Так видна касса за день.",
    },
    {
      targets: ["fin-expense"],
      title: "Расход",
      text: "Статья, сумма, касса. Это не списание со склада, а движение денег.",
    },
  ],
  employees: [
    {
      targets: ["nav-employees"],
      title: "Сотрудники",
      text: "Люди, роли и начисления. Суммы считает программа, не вручную.",
    },
    {
      targets: ["emp-list"],
      title: "Список",
      text: "Откройте карточку: роль, схема оплаты. Выплату делают, когда есть начисление.",
    },
  ],
  analytics: [
    {
      targets: ["nav-analytics"],
      title: "Отчёты",
      text: "Что приносит деньги за месяц: выручка, маржа, прибыль, брак.",
    },
    {
      targets: ["an-kpis"],
      title: "Показатели",
      text: "Карточка ведёт в раздел. Таблицы ниже — какие изделия выгодны.",
    },
    {
      targets: ["an-export"],
      title: "Выгрузка",
      text: "CSV и Excel — только файл. Данные в программе не меняются.",
    },
  ],
  settings: [
    {
      targets: ["nav-settings"],
      title: "Настройки",
      text: "Правила цеха: компания, валюта, скидка, кто что может нажать.",
    },
    {
      targets: ["set-nav"],
      title: "Разделы",
      text: "Единицы, пользователи, роли, согласования, резервные копии.",
    },
    {
      targets: ["set-form"],
      title: "Компания",
      text: "Имя, валюта, лимит скидки. Меняйте осторожно — влияет на заказы.",
    },
  ],
  notifications: [
    {
      targets: ["nav-bell", "page-notifications"],
      title: "Уведомления",
      text: "Согласования, низкий остаток, просрочки. Красная точка — есть новое.",
    },
    {
      targets: ["notif-list"],
      title: "Лента",
      text: "Отметьте прочитанными, когда разобрали. Иначе точка останется.",
    },
  ],
  search: [
    {
      targets: ["nav-search", "search-form"],
      title: "Поиск",
      text: "Номер заказа или имя клиента. Строка в меню слева ведёт сюда же.",
    },
  ],
};

const tjTour: Record<HelpPageId, TourStep[]> = {
  home: [
    {
      targets: [],
      intro: true,
      title: "Хуш омадед",
      text: "Цех аллакай кор мекунад. Ҳоло нишон медиҳем: даромад, кори имрӯз ва аввал чӣ кунед. «Ҷаҳидан» — ин экран. «Дигар намоиш надиҳ» — дар ин дастгоҳ дигар намебарояд.",
    },
    {
      targets: ["home-income"],
      title: "Даромади шумо",
      text: "Фурӯши моҳ, чӣ қадар гирифтед, қарзи мизоҷ ва фоидаи озод. Тирча — муқоиса бо моҳи гузашта.",
    },
    {
      targets: ["home-orders"],
      title: "Ҳозир дар цех",
      text: "Фармоишҳои охирин ва ҳолат: дар истеҳсолот, тайёр, ба мизоҷ дода шуд.",
    },
    {
      targets: ["home-attention"],
      title: "Ҳоло чӣ кунед",
      text: "Қарз, фармоиши дер ва ашёи кам. Аз бандҳои сурх оғоз кунед — имрӯз амал лозим аст.",
    },
    {
      targets: ["home-shortcuts"],
      title: "Амалҳои тез",
      text: "Фармоиши нав, мизоҷон, мол, истеҳсолот — бе ҷустуҷӯи меню.",
    },
    {
      targets: ["nav-orders"],
      title: "Фармоишҳо",
      text: "Ҳамаи дархостҳо. Созед, тасдиқ кунед — ба истеҳсолот меравад.",
    },
    {
      targets: ["nav-production"],
      title: "Истеҳсолот",
      text: "Вазифаи цех пас аз тасдиқи фармоиш: партия, факт, нуқсон.",
    },
    {
      targets: ["nav-warehouse"],
      title: "Анбор",
      text: "Ашё ва маҳсулоти тайёр. Агар сурх бошад — харид кунед.",
    },
    {
      targets: ["tour-lang"],
      title: "Забон",
      text: "RU ё TJ. Саҳифа нав мешавад. Номи мизоҷ ва мол намеивазад.",
    },
  ],
  products: [
    {
      targets: ["nav-products"],
      title: "Маҳсулот",
      text: "Молҳое, ки мефурӯшед, ва рецепти ашё ба 1 воҳиди фурӯш.",
    },
    {
      targets: ["products-new"],
      title: "Моли нав",
      text: "Ном, воҳид, нарх. Баъд дар корт рецептро пур кунед.",
    },
    {
      targets: ["products-list"],
      title: "Рӯйхат",
      text: "Нархи фурӯш ва арзиши ашё. Бе рецепт арзиш нопурра аст.",
    },
  ],
  sales: [
    {
      targets: ["nav-sales"],
      title: "Хулосаи моҳона",
      text: "Пул ва қарз: дар ин моҳ чӣ қадар фурӯхтем, кӣ қарздор, кадом фармоиш дер аст.",
    },
    {
      targets: ["sales-new", "orders-new"],
      title: "Фармоиши нав",
      text: "Ин ҷо ё дар «Фармоишҳо». Пардохт дар корти фармоиш.",
    },
    {
      targets: ["sales-debts"],
      title: "Қарзи мизоҷ",
      text: "То пурра пардохт нашудан, дар рӯйхат мемонад.",
    },
  ],
  crm: [
    {
      targets: ["nav-crm"],
      title: "Мизоҷон",
      text: "Кортҳои мизоҷ ва воронкаи лид — фармоиши эҳтимолӣ.",
    },
    {
      targets: ["crm-new"],
      title: "Мизоҷи нав",
      text: "Ном ё ширкат, телефон — захира. Баъд дар фармоиш интихоб мешавад.",
    },
    {
      targets: ["crm-lead"],
      title: "Лиди нав",
      text: "Агар ҳанӯз фикр мекунад. Ба воронка меравад.",
    },
    {
      targets: ["crm-pipeline"],
      title: "Воронка",
      text: "Сутунҳо — марҳала. Кортро ҷойгир кунед. Ҳангоми рад — сабаб нависед.",
    },
  ],
  orders: [
    {
      targets: ["nav-orders"],
      title: "Фармоишҳо",
      text: "Тасдиқ → истеҳсолот → анбор → ба мизоҷ.",
    },
    {
      targets: ["orders-new"],
      title: "Сохтани фармоиш",
      text: "Мизоҷ, мол, миқдор, нарх. Тахфиф танҳо дар ҳадди танзимот.",
    },
    {
      targets: ["orders-search"],
      title: "Ҷустуҷӯ",
      text: "Рақами фармоиш ё номи мизоҷ. Ҳолат — барои филтр.",
    },
    {
      targets: ["orders-list"],
      title: "Рӯйхат",
      text: "Сатрро кушоед: пардохт, чоп, ҳолат. Тугмаи торик — амали асосӣ.",
    },
  ],
  production: [
    {
      targets: ["nav-production"],
      title: "Истеҳсолот",
      text: "Вазифаи цех. Баъди тасдиқи фармоиш пайдо мешавад.",
    },
    {
      targets: ["production-list"],
      title: "Вазифаҳо",
      text: "Партия, факт, нуқсон. Баъди бастан — мол ба анбори тайёр.",
    },
  ],
  warehouse: [
    {
      targets: ["nav-warehouse"],
      title: "Анбор",
      text: "Ашё ва бақия. Агар кам бошад — харид кунед.",
    },
    {
      targets: ["warehouse-stock"],
      title: "Бақия",
      text: "Дар даст, резерв, дастрас. Резерв барои фармоиш банд аст.",
    },
    {
      targets: ["warehouse-in"],
      title: "Ворид",
      text: "Бақияи аввал ё қабул. Роҳи оддӣ — аз Харид.",
    },
    {
      targets: ["warehouse-out"],
      title: "Хориҷ",
      text: "Танҳо агар ашё бе фармоиш рафт. Тугмаи сурх — бебозгашт.",
    },
  ],
  purchasing: [
    {
      targets: ["nav-purchasing"],
      title: "Харид",
      text: "Таъминкунанда ва фармоиши ашё. Пардохт ҳам ин ҷо.",
    },
    {
      targets: ["po-suppliers"],
      title: "Таъминкунандагон",
      text: "Аввал корт. Бе он фармоиши харид намешавад.",
    },
    {
      targets: ["po-new"],
      title: "Фармоиш ба таъминкунанда",
      text: "Чӣ ва чӣ қадар. Вақти омадан — дар корт ба анбор қабул кунед.",
    },
  ],
  finance: [
    {
      targets: ["nav-finance"],
      title: "Молия",
      text: "Хазина/бонк — пули зинда. Фонд — ба куҷо тақсим шуд.",
    },
    {
      targets: ["fin-money"],
      title: "Пул",
      text: "Дар даст, аз рӯи фонд, қарзи таъминкунанда. Ин анбор нест.",
    },
    {
      targets: ["fin-shift"],
      title: "Басти хазина",
      text: "Субҳ кушоед, шом бандед.",
    },
    {
      targets: ["fin-expense"],
      title: "Хароҷот",
      text: "Модда, маблағ, хазина. Ин хориҷи анбор нест.",
    },
  ],
  employees: [
    {
      targets: ["nav-employees"],
      title: "Кормандон",
      text: "Одамон, нақш ва ҳаққ. Барнома ҳисоб мекунад.",
    },
    {
      targets: ["emp-list"],
      title: "Рӯйхат",
      text: "Кортро кушоед: нақш, схема. Пардохт вақте ки ҳисоб ҳаст.",
    },
  ],
  analytics: [
    {
      targets: ["nav-analytics"],
      title: "Ҳисобот",
      text: "Фурӯш, маржа, фоида, нуқсон дар моҳ.",
    },
    {
      targets: ["an-kpis"],
      title: "Нишондиҳандаҳо",
      text: "Карта ба бахш мебарад. Ҷадвал — кадом мол фоиданок.",
    },
    {
      targets: ["an-export"],
      title: "Файл",
      text: "CSV ва Excel. Маълумоти барнома иваз намешавад.",
    },
  ],
  settings: [
    {
      targets: ["nav-settings"],
      title: "Танзимот",
      text: "Қоидаҳо: ширкат, асъор, тахфиф, ҳуқуқ.",
    },
    {
      targets: ["set-nav"],
      title: "Бахшҳо",
      text: "Воҳид, корбар, нақш, тасдиқ, нусха.",
    },
    {
      targets: ["set-form"],
      title: "Ширкат",
      text: "Ном, асъор, ҳадди тахфиф. Эҳтиёт иваз кунед.",
    },
  ],
  notifications: [
    {
      targets: ["nav-bell", "page-notifications"],
      title: "Огоҳиҳо",
      text: "Тасдиқ, ашёи кам, фармоиши дер. Нуқтаи сурх — нав.",
    },
    {
      targets: ["notif-list"],
      title: "Рӯйхат",
      text: "Пас аз дидан — хондашуда кунед.",
    },
  ],
  search: [
    {
      targets: ["nav-search", "search-form"],
      title: "Ҷустуҷӯ",
      text: "Рақами фармоиш ё номи мизоҷ.",
    },
  ],
};

export function helpTour(locale: Locale, id: HelpPageId): TourStep[] {
  const steps = (locale === "tj" ? tjTour : ruTour)[id];
  const { tour } = getDomainHelpOverrides(locale);
  return steps.map((step, i) => {
    const key = `${id}:${step.targets[0] ?? String(i)}`;
    const text = tour?.[key];
    return text ? { ...step, text } : step;
  });
}

export type FaqItem = { id: string; q: string; a: string };

const ruFaq: FaqItem[] = [
  {
    id: "add-customer",
    q: "Как добавить нового клиента?",
    a: "Меню «Клиенты» → форма «Новый клиент»: имя или фирма, телефон. «Сохранить». Потом клиента выбирают в заказе.",
  },
  {
    id: "new-order",
    q: "Как создать заказ?",
    a: "«Заказы» → «Создать». Клиент, изделие, количество, цена. В карточке заказа подтвердите — уйдёт в производство.",
  },
  {
    id: "payment",
    q: "Как принять оплату?",
    a: "Откройте заказ → оплата: сумма и способ. Долг на Главной и в Продажах обновится сам.",
  },
  {
    id: "production",
    q: "Как запустить производство?",
    a: "Сначала подтвердите заказ. В «Производство» откроется задание. Там партии, факт и брак.",
  },
  {
    id: "stock-in",
    q: "Как оприходовать сырьё?",
    a: "Через «Закупки» (заказ → приём) или на «Складе» начальным остатком, если товар уже был в цехе.",
  },
  {
    id: "purchase",
    q: "Как оформить закупку?",
    a: "«Закупки» → поставщик → новый заказ. Когда привезли — примите. Оплату поставщику отметьте там же.",
  },
  {
    id: "expense",
    q: "Как провести расход?",
    a: "«Финансы» → расход: касса, статья, сумма. Это не списание склада, а движение денег.",
  },
  {
    id: "product",
    q: "Как добавить изделие и рецепт?",
    a: "«Продукция» → создать → карточка → рецепт: сырьё на единицу. Без рецепта себестоимость не считается.",
  },
  {
    id: "low-stock",
    q: "Что делать, если сырьё ниже минимума?",
    a: "На Главной жёлтый блок. Склад → закупка. Минимум задаётся в карточке материала.",
  },
  {
    id: "language",
    q: "Как сменить язык?",
    a: "Вверху справа RU / TJ. Страница обновится. Имена клиентов и товаров остаются как ввели.",
  },
  {
    id: "roles",
    q: "Почему не вижу кнопку?",
    a: "Роль ограничивает права. Полный доступ у владельца. Роли: «Настройки → Роли».",
  },
  {
    id: "hide-tips",
    q: "Как скрыть подсветку разделов?",
    a: "В подсказке нажмите «Пропустить» или «Больше не показывать». В Справке можно снова включить подсказки.",
  },
];

const tjFaq: FaqItem[] = [
  {
    id: "add-customer",
    q: "Чӣ тавр мизоҷи нав илова кунам?",
    a: "«Мизоҷон» → формаи «Мизоҷи нав»: ном, телефон. «Захира». Баъд дар фармоиш интихоб мешавад.",
  },
  {
    id: "new-order",
    q: "Чӣ тавр фармоиш созам?",
    a: "«Фармоишҳо» → «Сохтан». Мизоҷ, мол, миқдор, нарх. Дар корт тасдиқ — ба истеҳсолот.",
  },
  {
    id: "payment",
    q: "Чӣ тавр пардохт гирам?",
    a: "Фармоиш → пардохт: маблағ ва усул. Қарз худ нав мешавад.",
  },
  {
    id: "production",
    q: "Чӣ тавр истеҳсолотро оғоз кунам?",
    a: "Аввал фармоишро тасдиқ кунед. Дар «Истеҳсолот» вазифа мебарояд.",
  },
  {
    id: "stock-in",
    q: "Чӣ тавр ашёро ба анбор гирам?",
    a: "Аз «Харид» ё дар «Анбор» бақияи аввал.",
  },
  {
    id: "purchase",
    q: "Чӣ тавр харид кунам?",
    a: "«Харид» → таъминкунанда → фармоиш. Омадан — қабул. Пардохт ҳам ин ҷо.",
  },
  {
    id: "expense",
    q: "Чӣ тавр хароҷот нависам?",
    a: "«Молия» → хароҷот: хазина, модда, маблағ.",
  },
  {
    id: "product",
    q: "Чӣ тавр мол ва рецепт илова кунам?",
    a: "«Маҳсулот» → сохтан → корт → рецепт ба 1 воҳиди фурӯш.",
  },
  {
    id: "low-stock",
    q: "Ашё кам бошад чӣ кунам?",
    a: "Дар Асосӣ блоки зард. Анбор → харид.",
  },
  {
    id: "language",
    q: "Чӣ тавр забонро иваз кунам?",
    a: "Боло рост RU / TJ. Номи мизоҷ ва мол ҳамон мемонад.",
  },
  {
    id: "roles",
    q: "Чаро тугмаро намебинам?",
    a: "Нақш ҳуқуқро мебандад. Соҳиб ҳамаро мебинад. «Танзимот → Нақшҳо».",
  },
  {
    id: "hide-tips",
    q: "Чӣ тавр равшанкуниро пинҳон кунам?",
    a: "«Ҷаҳидан» ё «Дигар намоиш надиҳ». Дар Роҳнамо метавонед боз нишон диҳед.",
  },
];

export function helpFaq(locale: Locale): FaqItem[] {
  const faq = locale === "tj" ? tjFaq : ruFaq;
  const { faq: overrides } = getDomainHelpOverrides(locale);
  return faq.map((item) => {
    const a = overrides?.[item.id];
    return a ? { ...item, a } : item;
  });
}
