/** Facade production catalog — real workshop materials, products, recipes (per 1 m²).
 * Prices oriented to Dushanbe market (somoni): retail tiles ~70–120 с/м² on Somon.tj;
 * workshop sell prices include margin. Recipes: cement:sand ≈ 1:3 + pigment + plasticizer.
 */

export type FacadeMaterialDef = {
  name: string;
  category: string;
  packageWeight: string;
  packagePrice: string;
  minStock: string;
  /** Default KG; sand uses BUCKET purchase unit. */
  purchaseUnit?: "KG" | "BUCKET";
};

export type FacadeRecipeItemDef = {
  materialName: string;
  quantity: string;
  unitCode: "KG" | "G" | "BUCKET";
};

export type FacadeProductDef = {
  name: string;
  price: string;
  minPrice: string;
  /** Soft floor for FG replenishment. */
  minStock?: string;
  /** Soft ceiling — workers can pause production above this. */
  maxStock?: string;
  /** Worker pay с per 1 м² for this product. */
  laborRate?: string;
  outputPerBase: number;
  recipeComment: string;
  recipeItems: FacadeRecipeItemDef[];
  /** Path under /public, e.g. /catalog/foo.png */
  photoUrl?: string;
};

/** Raw materials — package prices roughly match Dushanbe building-supply levels (с). */
export const FACADE_MATERIALS: FacadeMaterialDef[] = [
  {
    name: "Цемент белый М500",
    category: "Цемент",
    packageWeight: "50",
    packagePrice: "210",
    minStock: "150",
  },
  {
    name: "Цемент серый М500",
    category: "Цемент",
    packageWeight: "50",
    packagePrice: "68",
    minStock: "200",
  },
  {
    name: "Песок кварцевый",
    category: "Заполнитель",
    packageWeight: "1",
    packagePrice: "14",
    minStock: "40",
    purchaseUnit: "BUCKET",
  },
  {
    name: "Пигмент оксид железа",
    category: "Пигмент",
    packageWeight: "25",
    packagePrice: "650",
    minStock: "15",
  },
  {
    name: "Пластификатор С-3",
    category: "Добавка",
    packageWeight: "10",
    packagePrice: "135",
    minStock: "8",
  },
  {
    name: "Клей монтажный",
    category: "Клей",
    packageWeight: "25",
    packagePrice: "480",
    minStock: "12",
  },
  {
    name: "Фибра полипропиленовая",
    category: "Добавка",
    packageWeight: "1",
    packagePrice: "45",
    minStock: "5",
  },
];

/** Base tile face mix per 1 m² (~18–22 mm). */
const TILE_BASE: FacadeRecipeItemDef[] = [
  { materialName: "Цемент белый М500", quantity: "8", unitCode: "KG" },
  { materialName: "Песок кварцевый", quantity: "1.5", unitCode: "BUCKET" },
  { materialName: "Пластификатор С-3", quantity: "80", unitCode: "G" },
  { materialName: "Клей монтажный", quantity: "50", unitCode: "G" },
];

const STONE_BASE: FacadeRecipeItemDef[] = [
  { materialName: "Цемент белый М500", quantity: "6", unitCode: "KG" },
  { materialName: "Цемент серый М500", quantity: "5", unitCode: "KG" },
  { materialName: "Песок кварцевый", quantity: "2", unitCode: "BUCKET" },
  { materialName: "Пластификатор С-3", quantity: "120", unitCode: "G" },
  { materialName: "Фибра полипропиленовая", quantity: "40", unitCode: "G" },
  { materialName: "Клей монтажный", quantity: "40", unitCode: "G" },
];

/** Finished goods sold by m²; recipes normalized per 1 m². */
export const FACADE_PRODUCTS: FacadeProductDef[] = [
  {
    name: "Фасадная плитка «Сланец» серый",
    price: "95",
    minPrice: "75",
    minStock: "30",
    maxStock: "400",
    outputPerBase: 10,
    recipeComment: "1 м² ≈ 10 плиток; сланец серый, пигмент оксид железа",
    photoUrl: "/catalog/facade-slate-gray.png",
    recipeItems: [
      ...TILE_BASE,
      { materialName: "Пигмент оксид железа", quantity: "350", unitCode: "G" },
    ],
  },
  {
    name: "Фасадная плитка «Кирпич» терракота",
    price: "100",
    minPrice: "80",
    minStock: "30",
    maxStock: "400",
    outputPerBase: 10,
    recipeComment: "1 м² ≈ 10 плиток; терракота, больше пигмента",
    photoUrl: "/catalog/facade-brick-terracotta.png",
    recipeItems: [
      ...TILE_BASE,
      { materialName: "Пигмент оксид железа", quantity: "450", unitCode: "G" },
    ],
  },
  {
    name: "Фасадная плитка «Травертин» бежевый",
    price: "110",
    minPrice: "85",
    minStock: "25",
    maxStock: "350",
    outputPerBase: 10,
    recipeComment: "1 м² ≈ 10 плиток; светлый травертин",
    photoUrl: "/catalog/facade-travertine-beige.png",
    recipeItems: [
      { materialName: "Цемент белый М500", quantity: "9", unitCode: "KG" },
      { materialName: "Песок кварцевый", quantity: "1.5", unitCode: "BUCKET" },
      { materialName: "Пластификатор С-3", quantity: "80", unitCode: "G" },
      { materialName: "Клей монтажный", quantity: "50", unitCode: "G" },
      { materialName: "Пигмент оксид железа", quantity: "180", unitCode: "G" },
    ],
  },
  {
    name: "Декоративный камень «Скала»",
    price: "130",
    minPrice: "100",
    minStock: "20",
    maxStock: "200",
    outputPerBase: 1,
    recipeComment: "1 м² ≈ 1 панель; смесь белый+серый цемент + фибра",
    photoUrl: "/catalog/facade-rock-charcoal.png",
    recipeItems: [
      ...STONE_BASE,
      { materialName: "Пигмент оксид железа", quantity: "280", unitCode: "G" },
    ],
  },
  {
    name: "Цоколь «Дикий камень»",
    price: "120",
    minPrice: "95",
    minStock: "15",
    maxStock: "180",
    outputPerBase: 1,
    recipeComment: "1 м² ≈ 1 панель цоколя; усиленная смесь",
    photoUrl: "/catalog/facade-plinth-wild.png",
    recipeItems: [
      { materialName: "Цемент белый М500", quantity: "5", unitCode: "KG" },
      { materialName: "Цемент серый М500", quantity: "7", unitCode: "KG" },
      { materialName: "Песок кварцевый", quantity: "2.2", unitCode: "BUCKET" },
      { materialName: "Пластификатор С-3", quantity: "140", unitCode: "G" },
      { materialName: "Фибра полипропиленовая", quantity: "50", unitCode: "G" },
      { materialName: "Клей монтажный", quantity: "45", unitCode: "G" },
      { materialName: "Пигмент оксид железа", quantity: "220", unitCode: "G" },
    ],
  },
];

/** Opening stock on RAW warehouse after domain seed (demo / testing). */
export const FACADE_OPENING_STOCK: Record<string, string> = {
  "Цемент белый М500": "2500",
  "Цемент серый М500": "3000",
  "Песок кварцевый": "400",
  "Пигмент оксид железа": "200",
  "Пластификатор С-3": "100",
  "Клей монтажный": "250",
  "Фибра полипропиленовая": "40",
};
