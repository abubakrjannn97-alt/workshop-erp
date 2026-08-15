/** Demo accounts for local RBAC testing (seed + dev quick login). */
export const DEMO_PASSWORD = "ChangeMeNow!";

export const DEMO_USERS = [
  { email: "owner@workshop.local", roleCode: "owner", name: "Владелец" },
  { email: "director@workshop.local", roleCode: "director", name: "Директор" },
  { email: "sales@workshop.local", roleCode: "sales_manager", name: "Менеджер продаж" },
  { email: "production@workshop.local", roleCode: "production_manager", name: "Начальник производства" },
  { email: "worker@workshop.local", roleCode: "worker", name: "Рабочий цеха" },
  { email: "warehouse@workshop.local", roleCode: "warehouse_manager", name: "Кладовщик" },
  { email: "accountant@workshop.local", roleCode: "accountant", name: "Бухгалтер" },
] as const;

export type DemoUserEmail = (typeof DEMO_USERS)[number]["email"];

export function isDemoUserEmail(email: string): email is DemoUserEmail {
  return DEMO_USERS.some((u) => u.email === email);
}

export function getDemoUsersForLogin() {
  if (process.env.NODE_ENV === "production") return [];
  return DEMO_USERS.map((u) => ({ email: u.email, roleCode: u.roleCode, name: u.name }));
}
