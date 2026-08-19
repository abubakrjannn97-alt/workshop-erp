import type { LucideIcon } from "lucide-react";
import {
  ClipboardList,
  Users,
  Factory,
  Package,
  Truck,
  ChartColumn,
  Play,
  Plus,
  Box,
} from "lucide-react";

export type DashActionTone = "orange" | "green" | "blue" | "purple" | "gold";

export type DashQuickAction = {
  href: string;
  label: string;
  icon: LucideIcon;
  tone?: DashActionTone;
};

export function ownerQuickActions(t: (key: string) => string): DashQuickAction[] {
  return [
    { href: "/orders/new", label: t("sales.newOrder"), icon: ClipboardList, tone: "orange" },
    { href: "/crm", label: t("nav.crm"), icon: Users, tone: "blue" },
    { href: "/production", label: t("nav.production"), icon: Factory, tone: "green" },
    { href: "/warehouse", label: t("nav.warehouse"), icon: Package, tone: "purple" },
  ];
}

export function ownerDesktopQuickActions(t: (key: string) => string): DashQuickAction[] {
  return [
    { href: "/orders/new", label: t("sales.newOrder"), icon: Plus, tone: "orange" },
    { href: "/production", label: t("home.actionStartProduction"), icon: Play, tone: "green" },
    { href: "/products/new", label: t("home.actionAddProduct"), icon: Box, tone: "blue" },
    { href: "/warehouse", label: t("home.actionToWarehouse"), icon: Truck, tone: "purple" },
    { href: "/analytics", label: t("home.actionDailyReport"), icon: ChartColumn, tone: "gold" },
  ];
}

export function ownerSecondaryActions(t: (key: string) => string): DashQuickAction[] {
  return [
    { href: "/purchasing", label: t("nav.purchasing"), icon: Truck, tone: "purple" },
    { href: "/analytics", label: t("nav.analytics"), icon: ChartColumn, tone: "gold" },
  ];
}

export function ownerMobileQuickActions(t: (key: string) => string): DashQuickAction[] {
  return [
    { href: "/orders/new", label: t("sales.newOrder"), icon: Plus, tone: "orange" },
    { href: "/production", label: t("home.actionStartProduction"), icon: Play, tone: "green" },
    { href: "/warehouse", label: t("home.actionToWarehouse"), icon: Truck, tone: "purple" },
    { href: "/analytics", label: t("home.actionDailyReport"), icon: ChartColumn, tone: "gold" },
  ];
}
