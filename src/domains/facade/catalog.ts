/** Facade production catalog — materials, products, recipes (domain data only). */

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
  outputPerBase: number;
  recipeComment: string;
  recipeItems: FacadeRecipeItemDef[];
};

/** Raw materials for facade tile / decorative stone production. */
export const FACADE_MATERIALS: FacadeMaterialDef[] = [
  {
    name: "Белый цемент",
    category: "Цемент",
    packageWeight: "50",
    packagePrice: "200",
    minStock: "200",
  },
  {
    name: "Обычный цемент",
    category: "Цемент",
    packageWeight: "50",
    packagePrice: "65",
    minStock: "200",
  },
  {
    name: "Краска",
    category: "Краска",
    packageWeight: "25",
    packagePrice: "600",
    minStock: "20",
  },
  {
    name: "Клей",
    category: "Клей",
    packageWeight: "25",
    packagePrice: "500",
    minStock: "15",
  },
  {
    name: "Песок",
    category: "Заполнитель",
    packageWeight: "1",
    packagePrice: "15",
    minStock: "50",
    purchaseUnit: "BUCKET",
  },
  {
    name: "Пластификатор",
    category: "Добавка",
    packageWeight: "10",
    packagePrice: "120",
    minStock: "10",
  },
];

const TILE_RECIPE: FacadeRecipeItemDef[] = [
  { materialName: "Белый цемент", quantity: "7", unitCode: "KG" },
  { materialName: "Краска", quantity: "400", unitCode: "G" },
  { materialName: "Клей", quantity: "60", unitCode: "G" },
  { materialName: "Песок", quantity: "1", unitCode: "BUCKET" },
];

/** Finished goods sold by m²; recipes normalized per 1 m². */
export const FACADE_PRODUCTS: FacadeProductDef[] = [
  {
    name: "Фасадная плитка",
    price: "150",
    minPrice: "120",
    outputPerBase: 10,
    recipeComment: "Стартовая норма: 1 м² / 10 плиток",
    recipeItems: TILE_RECIPE,
  },
  {
    name: "Фасадная плитка «Серый»",
    price: "155",
    minPrice: "125",
    outputPerBase: 10,
    recipeComment: "Серый оттенок: 1 м² / 10 плиток",
    recipeItems: TILE_RECIPE,
  },
  {
    name: "Фасадная плитка «Песочный»",
    price: "145",
    minPrice: "118",
    outputPerBase: 10,
    recipeComment: "Песочный оттенок: 1 м² / 10 плиток",
    recipeItems: TILE_RECIPE,
  },
  {
    name: "Декоративный камень",
    price: "180",
    minPrice: "140",
    outputPerBase: 1,
    recipeComment: "Декоративный камень: 1 м² / 1 блок",
    recipeItems: [
      { materialName: "Белый цемент", quantity: "9", unitCode: "KG" },
      { materialName: "Обычный цемент", quantity: "3", unitCode: "KG" },
      { materialName: "Краска", quantity: "250", unitCode: "G" },
      { materialName: "Клей", quantity: "50", unitCode: "G" },
      { materialName: "Песок", quantity: "2", unitCode: "BUCKET" },
      { materialName: "Пластификатор", quantity: "200", unitCode: "G" },
    ],
  },
];

/** Opening stock on RAW warehouse after domain seed (demo / dev). */
export const FACADE_OPENING_STOCK: Record<string, string> = {
  "Белый цемент": "2000",
  "Обычный цемент": "1500",
  Краска: "500",
  Клей: "300",
  Песок: "500",
  Пластификатор: "80",
};
