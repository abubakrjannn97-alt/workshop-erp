import type { DashQuickActionIconId } from "./dash-quick-action-icons";

export type DashActionTone = "orange" | "green" | "blue" | "purple" | "gold";

export type DashQuickAction = {
  href: string;
  label: string;
  icon: DashQuickActionIconId;
  tone?: DashActionTone;
};

/** Owner home shortcuts: expense, debts, purchasing, CRM, employees. */
export function ownerHomeQuickActions(t: (key: string) => string): DashQuickAction[] {
  return [
    { href: "/finance/expenses", label: t("home.actionExpense"), icon: "clipboard-list", tone: "gold" },
    { href: "/finance/debts", label: t("home.debtsShort"), icon: "banknote", tone: "blue" },
    { href: "/purchasing", label: t("nav.purchasing"), icon: "truck", tone: "purple" },
    { href: "/crm", label: t("nav.crm"), icon: "users", tone: "orange" },
    { href: "/employees", label: t("nav.employees"), icon: "factory", tone: "green" },
  ];
}

export function ownerQuickActions(t: (key: string) => string): DashQuickAction[] {
  return ownerHomeQuickActions(t);
}

export function ownerDesktopQuickActions(t: (key: string) => string): DashQuickAction[] {
  return ownerHomeQuickActions(t);
}

export function ownerMobileQuickActions(t: (key: string) => string): DashQuickAction[] {
  return ownerHomeQuickActions(t);
}

export function ownerSecondaryActions(_t: (key: string) => string): DashQuickAction[] {
  return [];
}
