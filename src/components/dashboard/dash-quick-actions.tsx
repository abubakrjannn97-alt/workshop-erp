import type { LucideIcon } from "lucide-react";
import {
  ClipboardList,
  Users,
  Factory,
  Package,
  Truck,
  ChartColumn,
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

export function ownerSecondaryActions(t: (key: string) => string): DashQuickAction[] {
  return [
    { href: "/purchasing", label: t("nav.purchasing"), icon: Truck },
    { href: "/analytics", label: t("nav.analytics"), icon: ChartColumn },
  ];
}

export function DashQuickActionsDesktop({
  primary,
}: {
  primary: DashQuickAction[];
  secondary?: DashQuickAction[];
}) {
  return (
    <ul className={styles.actions}>
      {primary.slice(0, 4).map((action) => {
        const Icon = action.icon;
        return (
          <li key={action.href}>
            <Link href={action.href} className={styles.action}>
              <Icon size={18} strokeWidth={ICON_STROKE} aria-hidden />
              <span className={styles.rowTitle}>{action.label}</span>
            </Link>
          </li>
        );
      })}
    </ul>
  );
}

export function DashQuickActionsMobile({ actions }: { actions: DashQuickAction[] }) {
  return (
    <ul>
      {actions.slice(0, 4).map((action) => {
        const Icon = action.icon;
        return (
          <li key={action.href}>
            <Link href={action.href} className={styles.row}>
              <Icon size={20} strokeWidth={ICON_STROKE} aria-hidden />
              <span className={styles.rowTitle}>{action.label}</span>
              <span className={styles.rowGo}>→</span>
            </Link>
          </li>
        );
      })}
    </ul>
  );
}
