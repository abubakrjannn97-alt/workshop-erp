import type { LucideIcon } from "lucide-react";
import {
  BadgePercent,
  Bell,
  Boxes,
  ChartColumn,
  Check,
  CircleCheck,
  CircleQuestionMark,
  CircleUser,
  ClipboardList,
  Clock,
  Contact,
  Ellipsis,
  Factory,
  Hammer,
  Inbox,
  Info,
  LayoutDashboard,
  Layers,
  Package,
  Pencil,
  Plus,
  Receipt,
  Recycle,
  Search,
  Settings,
  ShoppingCart,
  Trash2,
  TriangleAlert,
  Truck,
  UserRound,
  Users,
  Wallet,
  Warehouse,
  X,
} from "lucide-react";
import type { NavIcon } from "@core/shared/nav";

/** Shared stroke for every Lucide glyph in the product. */
export const ICON_STROKE = 2;

export const NAV_ICONS: Record<NavIcon, LucideIcon> = {
  home: LayoutDashboard,
  sales: ShoppingCart,
  crm: Contact,
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
  more: Ellipsis,
  commission: BadgePercent,
  batches: Layers,
  scrap: Recycle,
  inventory: Boxes,
  expenses: Receipt,
  jobs: Hammer,
  history: Clock,
  profile: CircleUser,
  reports: ChartColumn,
  approvals: CircleCheck,
  audit: Inbox,
  notifications: Bell,
  search: Search,
};

export type ActionIcon =
  | "dashboard"
  | "orders"
  | "customers"
  | "crm"
  | "production"
  | "warehouse"
  | "materials"
  | "suppliers"
  | "finance"
  | "employees"
  | "settings"
  | "help"
  | "notifications"
  | "search"
  | "add"
  | "edit"
  | "delete"
  | "approve"
  | "reject"
  | "warning"
  | "success"
  | "information";

export const ACTION_ICONS: Record<ActionIcon, LucideIcon> = {
  dashboard: LayoutDashboard,
  orders: ClipboardList,
  customers: UserRound,
  crm: Contact,
  production: Factory,
  warehouse: Warehouse,
  materials: Boxes,
  suppliers: Truck,
  finance: Wallet,
  employees: UserRound,
  settings: Settings,
  help: CircleQuestionMark,
  notifications: Bell,
  search: Search,
  add: Plus,
  edit: Pencil,
  delete: Trash2,
  approve: Check,
  reject: X,
  warning: TriangleAlert,
  success: CircleCheck,
  information: Info,
};

export function NavIconGlyph({ icon, size = 20 }: { icon: NavIcon; size?: number }) {
  const Icon = NAV_ICONS[icon] ?? Settings;
  return <Icon size={size} strokeWidth={ICON_STROKE} aria-hidden />;
}

export function ActionIconGlyph({
  icon,
  size = 20,
}: {
  icon: ActionIcon;
  size?: number;
}) {
  const Icon = ACTION_ICONS[icon] ?? Inbox;
  return <Icon size={size} strokeWidth={ICON_STROKE} aria-hidden />;
}
