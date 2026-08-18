import type { LucideIcon } from "lucide-react";
import {
  ChartColumn,
  CircleQuestionMark,
  ClipboardList,
  Factory,
  House,
  Package,
  Settings,
  ShoppingCart,
  Truck,
  UserRound,
  Users,
  Wallet,
  Warehouse,
} from "lucide-react";
import type { NavIcon } from "@core/shared/nav";

export const NAV_ICONS: Record<NavIcon, LucideIcon> = {
  home: House,
  sales: ShoppingCart,
  crm: Users,
  orders: ClipboardList,
  products: Package,
  production: Factory,
  warehouse: Warehouse,
  purchasing: Truck,
  finance: Wallet,
  employees: UserRound,
  analytics: ChartColumn,
  settings: Settings,
  help: CircleQuestionMark,
  more: Settings,
  commission: Wallet,
  batches: ClipboardList,
  scrap: CircleQuestionMark,
  inventory: Warehouse,
  expenses: Wallet,
  jobs: Factory,
  history: ClipboardList,
  profile: UserRound,
  reports: ChartColumn,
  notifications: CircleQuestionMark,
  search: CircleQuestionMark,
};

export function NavIconGlyph({ icon, size = 20 }: { icon: NavIcon; size?: number }) {
  const Icon = NAV_ICONS[icon] ?? Settings;
  return <Icon size={size} strokeWidth={1.75} aria-hidden />;
}
