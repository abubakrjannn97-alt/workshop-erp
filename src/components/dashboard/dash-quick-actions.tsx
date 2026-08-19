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
import Link from "next/link";
import { ICON_STROKE } from "@/components/nav-icons";
import styles from "./dash-home.module.css";

export type DashQuickAction = {
  href: string;
  label: string;
  icon: LucideIcon;
};

export function ownerQuickActions(t: (key: string) => string): DashQuickAction[] {
  return [
    { href: "/orders/new", label: t("sales.newOrder"), icon: ClipboardList },
    { href: "/crm", label: t("nav.crm"), icon: Users },
    { href: "/production", label: t("nav.production"), icon: Factory },
    { href: "/warehouse", label: t("nav.warehouse"), icon: Package },
  ];
}

export function ownerDesktopQuickActions(t: (key: string) => string): DashQuickAction[] {
  return [
    { href: "/orders/new", label: t("sales.newOrder"), icon: Plus },
    { href: "/production", label: t("home.actionStartProduction"), icon: Play },
    { href: "/products/new", label: t("home.actionAddProduct"), icon: Box },
    { href: "/warehouse", label: t("home.actionToWarehouse"), icon: Truck },
    { href: "/analytics", label: t("home.actionDailyReport"), icon: ChartColumn },
  ];
}

export function ownerSecondaryActions(t: (key: string) => string): DashQuickAction[] {
  return [
    { href: "/purchasing", label: t("nav.purchasing"), icon: Truck },
    { href: "/analytics", label: t("nav.analytics"), icon: ChartColumn },
  ];
}

export function DashQuickActions({
  actions,
  layout = "mobile",
}: {
  actions: DashQuickAction[];
  layout?: "mobile" | "desktop";
}) {
  const gridClass = layout === "desktop" ? `${styles.actions} ${styles.actionsDesktop}` : styles.actions;

  return (
    <ul className={gridClass}>
      {actions.map((action) => {
        const Icon = action.icon;
        return (
          <li key={action.href}>
            <Link href={action.href} className={styles.action}>
              <span className={styles.actionIcon}>
                <Icon size={20} strokeWidth={ICON_STROKE} aria-hidden />
              </span>
              <span className={styles.actionLabel}>{action.label}</span>
            </Link>
          </li>
        );
      })}
    </ul>
  );
}

export function DashQuickActionsDesktop({
  primary,
}: {
  primary: DashQuickAction[];
  secondary?: DashQuickAction[];
}) {
  return <DashQuickActions actions={primary} layout="desktop" />;
}

export function DashQuickActionsMobile({ actions }: { actions: DashQuickAction[] }) {
  return <DashQuickActions actions={actions} layout="mobile" />;
}
