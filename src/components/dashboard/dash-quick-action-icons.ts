import type { LucideIcon } from "lucide-react";
import {
  Box,
  ChartColumn,
  ClipboardList,
  Factory,
  Package,
  Play,
  Plus,
  Truck,
  Users,
} from "lucide-react";

export const QUICK_ACTION_ICONS = {
  plus: Plus,
  play: Play,
  box: Box,
  truck: Truck,
  "chart-column": ChartColumn,
  "clipboard-list": ClipboardList,
  users: Users,
  factory: Factory,
  package: Package,
} as const satisfies Record<string, LucideIcon>;

export type DashQuickActionIconId = keyof typeof QUICK_ACTION_ICONS;

export function quickActionIcon(id: DashQuickActionIconId): LucideIcon {
  return QUICK_ACTION_ICONS[id];
}
