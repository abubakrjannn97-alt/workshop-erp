export const PERMISSIONS = {
  "users.view": { name: "Просмотр пользователей", module: "users" },
  "users.create": { name: "Создание пользователей", module: "users" },
  "users.edit": { name: "Изменение пользователей", module: "users" },
  "users.archive": { name: "Архивация пользователей", module: "users" },
  "roles.view": { name: "Просмотр ролей", module: "roles" },
  "roles.manage": { name: "Управление ролями и правами", module: "roles" },
  "settings.view": { name: "Просмотр настроек", module: "settings" },
  "settings.edit": { name: "Изменение настроек бизнеса", module: "settings" },
  "units.view": { name: "Просмотр единиц", module: "units" },
  "units.manage": { name: "Управление единицами", module: "units" },
  "audit.view": { name: "Просмотр журнала действий", module: "audit" },
  "products.view": { name: "Просмотр продукции", module: "products" },
  "products.manage": { name: "Управление продукцией и ценами", module: "products" },
  "materials.view": { name: "Просмотр сырья", module: "materials" },
  "materials.manage": { name: "Управление сырьём и закупочными ценами", module: "materials" },
  "recipes.view": { name: "Просмотр рецептур", module: "recipes" },
  "recipes.manage": { name: "Изменение рецептур", module: "recipes" },
  "orders.view": { name: "Просмотр заказов", module: "orders" },
  "orders.create": { name: "Создание заказов", module: "orders" },
  "orders.discount": { name: "Скидка в заказе", module: "orders" },
  "orders.cancel": { name: "Отмена заказа", module: "orders" },
  "payments.create": { name: "Приём оплаты по заказу", module: "orders" },
  "inventory.view": { name: "Просмотр склада", module: "inventory" },
  "inventory.adjust": { name: "Корректировка склада", module: "inventory" },
  "finance.view": { name: "Просмотр финансов", module: "finance" },
  "finance.expense.create": { name: "Создание расхода", module: "finance" },
  "finance.transfer": { name: "Финансовый перевод", module: "finance" },
  "salary.approve": { name: "Подтверждение зарплаты", module: "salary" },
  "crm.view": { name: "Просмотр CRM", module: "crm" },
  "crm.manage": { name: "Управление клиентами и воронкой", module: "crm" },
  "production.view": { name: "Просмотр производства", module: "production" },
  "production.manage": { name: "Управление производством", module: "production" },
  "production.report": { name: "Факт по партиям", module: "production" },
  "purchasing.view": { name: "Просмотр закупок", module: "purchasing" },
  "purchasing.manage": { name: "Заявки и заказы поставщикам", module: "purchasing" },
  "purchasing.receive": { name: "Приёмка закупки на склад", module: "purchasing" },
  "suppliers.view": { name: "Просмотр поставщиков", module: "suppliers" },
  "suppliers.manage": { name: "Управление поставщиками", module: "suppliers" },
  "inventory.receive": { name: "Приход на склад", module: "inventory" },
  "inventory.count": { name: "Инвентаризация", module: "inventory" },
  "analytics.view": { name: "Просмотр аналитики", module: "analytics" },
  "approvals.decide": { name: "Согласование опасных операций", module: "control" },
} as const;

export type PermissionCode = keyof typeof PERMISSIONS;

export function hasPermission(
  permissions: string[] | undefined,
  roleCode: string | undefined,
  code: PermissionCode,
) {
  if (roleCode === "owner") return true;
  return Boolean(permissions?.includes(code));
}

/** Sale price is ok; recipe/purchase cost is not for sales_manager (TZ: seller must not see себестоимость). */
export function canSeeMaterialCost(
  permissions: string[] | undefined,
  roleCode: string | undefined,
) {
  return (
    hasPermission(permissions, roleCode, "materials.view") ||
    hasPermission(permissions, roleCode, "recipes.view") ||
    hasPermission(permissions, roleCode, "finance.view") ||
    hasPermission(permissions, roleCode, "products.manage")
  );
}

/** Permissions the owner can grant when adding an employee (no admin/user management). */
export const EMPLOYEE_ASSIGNABLE: PermissionCode[] = (
  Object.keys(PERMISSIONS) as PermissionCode[]
).filter(
  (code) =>
    !code.startsWith("users.") &&
    !code.startsWith("roles.") &&
    code !== "settings.edit" &&
    code !== "approvals.decide",
);

type UserWithPerms = {
  role: {
    code: string;
    permissions: { permission: { code: string } }[];
  };
  permissions?: { permission: { code: string } }[];
};

export function resolveUserPermissions(user: UserWithPerms): string[] {
  const rolePerms = user.role.permissions.map((rp) => rp.permission.code);
  const extra = user.permissions?.map((up) => up.permission.code) ?? [];
  if (user.role.code === "employee") {
    return extra;
  }
  return [...new Set([...rolePerms, ...extra])];
}

export function usesWorkerMobileExperience(roleCode: string, permissions: string[]): boolean {
  if (roleCode === "worker") return true;
  if (roleCode !== "employee") return false;
  const hasDashboard =
    hasPermission(permissions, roleCode, "finance.view") ||
    hasPermission(permissions, roleCode, "crm.view") ||
    hasPermission(permissions, roleCode, "inventory.view") ||
    hasPermission(permissions, roleCode, "orders.view") ||
    hasPermission(permissions, roleCode, "production.manage");
  if (hasDashboard) return false;
  return (
    hasPermission(permissions, roleCode, "production.view") ||
    hasPermission(permissions, roleCode, "production.report")
  );
}

export const ROLE_PERMISSIONS: Record<string, PermissionCode[]> = {
  owner: Object.keys(PERMISSIONS) as PermissionCode[],
  director: [
    "users.view",
    "users.create",
    "users.edit",
    "roles.view",
    "settings.view",
    "settings.edit",
    "units.view",
    "units.manage",
    "audit.view",
    "products.view",
    "products.manage",
    "materials.view",
    "materials.manage",
    "recipes.view",
    "recipes.manage",
    "orders.view",
    "orders.create",
    "orders.discount",
    "orders.cancel",
    "payments.create",
    "inventory.view",
    "inventory.adjust",
    "inventory.receive",
    "inventory.count",
    "finance.view",
    "finance.expense.create",
    "finance.transfer",
    "salary.approve",
    "crm.view",
    "crm.manage",
    "production.view",
    "production.manage",
    "production.report",
    "purchasing.view",
    "purchasing.manage",
    "purchasing.receive",
    "suppliers.view",
    "suppliers.manage",
    "analytics.view",
    "approvals.decide",
  ],
  production_manager: [
    "production.view",
    "production.manage",
    "production.report",
    "inventory.view",
    "orders.view",
    "units.view",
    "products.view",
    "materials.view",
    "recipes.view",
    "recipes.manage",
  ],
  worker: ["production.view", "production.report", "products.view", "inventory.view", "inventory.receive"],
  employee: [],
  warehouse_manager: [
    "inventory.view",
    "inventory.adjust",
    "inventory.receive",
    "inventory.count",
    "purchasing.view",
    "purchasing.manage",
    "purchasing.receive",
    "suppliers.view",
    "suppliers.manage",
    "units.view",
    "materials.view",
    "products.view",
  ],
  accountant: [
    "finance.view",
    "finance.expense.create",
    "finance.transfer",
    "salary.approve",
    "users.view",
    "orders.view",
    "payments.create",
    "purchasing.view",
    "suppliers.view",
  ],
  sales_manager: [
    "orders.view",
    "orders.create",
    "orders.discount",
    "payments.create",
    "crm.view",
    "crm.manage",
    "units.view",
    "products.view",
    "inventory.view",
    "inventory.receive",
  ],
};
