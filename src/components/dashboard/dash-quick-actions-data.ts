import type { DashQuickActionIconId } from "./dash-quick-action-icons";

export type DashActionTone = "orange" | "green" | "blue" | "purple" | "gold";

export type DashQuickAction = {
  href: string;
  label: string;
  icon: DashQuickActionIconId;
  tone?: DashActionTone;
};

export function ownerQuickActions(t: (key: string) => string): DashQuickAction[] {
  return [
    { href: "/orders/quick", label: t("sales.newOrder"), icon: "clipboard-list", tone: "orange" },
    { href: "/crm", label: t("nav.crm"), icon: "users", tone: "blue" },
    { href: "/warehouse", label: t("nav.warehouse"), icon: "package", tone: "purple" },
  ];
}

export function ownerDesktopQuickActions(t: (key: string) => string): DashQuickAction[] {
  return [
    { href: "/orders/quick", label: t("sales.newOrder"), icon: "plus", tone: "orange" },
    { href: "/finance/expenses", label: t("nav.expenses"), icon: "clipboard-list", tone: "gold" },
    { href: "/finance/debts", label: t("home.debtsShort"), icon: "banknote", tone: "blue" },
    { href: "/warehouse", label: t("home.actionToWarehouse"), icon: "truck", tone: "purple" },
  ];
}

export function ownerSecondaryActions(t: (key: string) => string): DashQuickAction[] {
  return [
    { href: "/purchasing", label: t("nav.purchasing"), icon: "truck", tone: "purple" },
    { href: "/analytics", label: t("nav.analytics"), icon: "chart-column", tone: "gold" },
  ];
}

export function ownerMobileQuickActions(t: (key: string) => string): DashQuickAction[] {
  return [
    { href: "/orders/quick", label: t("sales.newOrder"), icon: "plus", tone: "orange" },
    { href: "/finance/expenses", label: t("nav.expenses"), icon: "clipboard-list", tone: "gold" },
    { href: "/finance/debts", label: t("home.debtsShort"), icon: "banknote", tone: "blue" },
    { href: "/warehouse", label: t("home.actionToWarehouse"), icon: "truck", tone: "purple" },
  ];
}
